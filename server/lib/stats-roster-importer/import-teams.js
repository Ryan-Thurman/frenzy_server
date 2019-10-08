'use strict';

const assert = require('assert');
const {StatsTeam} = require('../stats-client');

/**
 * Updates local ProTeam table from Stats.com API server
 * @param {Loopback.LoopbackApplication|Object} app A Loopback application instance
 *   or just an object with a property `models` containing the ProTeam model.
 * @param {Array<ProLeague>} leagues Leagues for which to fetch teams
 * @return {Promise<Array<ProTeam>>} Newly created or updated ProTeams
 */
module.exports = async function importTeams(app, leagues) {
  const {ProTeam} = app.models;

  // Fetch remote data
  let allStatsTeams = [];
  const proLeaguesByStatsTeamId = {};
  for (const league of leagues) {
    let statsTeamsForLeague;
    try {
      statsTeamsForLeague = await StatsTeam.query(league.statsPath);
    } catch (e) {
      console.warn('Could not load teams for league', league.statsPath);
      if (e.statusCode === 404) {
        continue;
      } else if (e.statusCode === 403) {
        console.error(e);
        continue;
      } else {
        throw e;
      }
    }
    assert(statsTeamsForLeague.length, 'StatsTeam.query should not return an empty result');
    for (const team of statsTeamsForLeague) {
      proLeaguesByStatsTeamId[team.teamId] = league;
    }
    allStatsTeams = allStatsTeams.concat(statsTeamsForLeague);
  }

  // Compare to local database
  const teamIds = allStatsTeams.map(team => team.teamId);
  const matchingProTeams = await ProTeam.find({
    where: {statsId: {inq: teamIds}},
  });

  // Flag any local records missing from remote dataset
  await ProTeam.updateAll({statsId: {nin: teamIds}}, {statsActive: false});

  const proTeams = await Promise.all(allStatsTeams.map(async team => {
    // Does it already exist in the database?
    let matchingProTeam = matchingProTeams.find(proTeam => proTeam.statsId === team.teamId);
    if (matchingProTeam) {
      // Update existing record
      matchingProTeam = await matchingProTeam.updateAttributes(team.toProTeamData());
    } else {
      // Create new record
      matchingProTeam = await ProTeam.create(team.toProTeamData());
    }

    // Associate with the league
    matchingProTeam.proLeague(proLeaguesByStatsTeamId[team.teamId]);

    return matchingProTeam.save();
  }));

  return proTeams;
};
