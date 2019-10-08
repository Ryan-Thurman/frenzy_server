'use strict';

const assert = require('assert');
const {StatsTeam} = require('./stats-client');
const {merge} = require('lodash');

/**
 * Updates local ProTeam table from Stats.com API server
 * @param {Loopback.LoopbackApplication|Object} app A Loopback application instance
 *   or just an object with a property `models` containing the ProTeam model.
 * @param {Array<string>} [whitelist] Only load leagues with the specified `leaguePath`s.
 * @param {Array<string>} [blacklist] Ignore leagues with the specified `leaguePath`s.
 * @return {Promise<Array<ProTeam>>} Newly created or updated ProTeams
 */
module.exports = async function updateStandings(app, whitelist = [], blacklist = []) {
  const {ProTeam, ProLeague} = app.models;

  // Determine which data to fetch
  let leaguePaths = [];
  if (whitelist.length)
    leaguePaths = whitelist.slice();
  if (blacklist.length)
    leaguePaths = leaguePaths.filter(path => !blacklist.includes(path));
  if (!leaguePaths.length) {
    const activeLeagues = await ProLeague.find({
      where: {
        statsPath: {
          nin: blacklist,
        },
        statsActive: true,
      },
    });
    leaguePaths = activeLeagues.map(league => league.statsPath);
  }

  // Fetch remote data
  let allStatsTeams = [];
  for (const leaguePath of leaguePaths) {
    const statsTeamsForLeague = await StatsTeam.queryStandings(leaguePath);
    assert(statsTeamsForLeague.length, 'StatsTeam.query should not return an empty result');
    allStatsTeams = allStatsTeams.concat(statsTeamsForLeague);
  }

  // Compare to local database
  const teamIds = allStatsTeams.map(team => team.teamId);
  const matchingProTeams = await ProTeam.find({
    where: {statsId: {inq: teamIds}},
  });

  const proTeams = await Promise.all(allStatsTeams.map(async team => {
    // Does it already exist in the database?
    let matchingProTeam = matchingProTeams.find(proTeam => proTeam.statsId === team.teamId);
    if (matchingProTeam) {
      // Update existing record

      // We need to merge records because the data is collected
      // in several steps from different API endpoints.
      const mergedStatsTeam = new StatsTeam(merge(team, matchingProTeam.statsRawData));

      matchingProTeam = await matchingProTeam.updateAttributes(mergedStatsTeam.toProTeamData());
    } else {
      // Create new record
      matchingProTeam = await ProTeam.create(team.toProTeamData());
    }

    return matchingProTeam.save();
  }));

  return proTeams;
};
