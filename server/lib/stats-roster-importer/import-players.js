'use strict';

const assert = require('assert');
const {StatsPlayer} = require('../stats-client');

/**
 * Updates local ProPlayer table from Stats.com API server
 * @param {Loopback.LoopbackApplication|Object} app A Loopback application instance
 *   or just an object with a property `models` containing the ProPlayer and ProTeam models.
 * @param {Array<ProLeague>} leagues Leagues for which to fetch teams
 * @return {Promise<Array<ProPlayer>>} Newly created or updated ProPlayers
 */
module.exports = async function importPlayers(app, leagues) {
  const {ProPlayer, ProTeam} = app.models;

  // Fetch remote data
  let allStatsPlayers = [];
  const proLeaguesByStatsPlayerId = {};
  for (const league of leagues) {
    let statsPlayersForLeague;
    try {
      statsPlayersForLeague = await StatsPlayer.query(league.statsPath);
    } catch (e) {
      console.warn('Could not load players for league', league.statsPath);
      if (e.statusCode === 404) {
        continue;
      } else if (e.statusCode === 403) {
        continue;
      } else {
        throw e;
      }
    }
    assert(statsPlayersForLeague.length, 'StatsPlayer.query should not return an empty result');
    for (const player of statsPlayersForLeague) {
      proLeaguesByStatsPlayerId[player.playerId] = league;
    }
    allStatsPlayers = allStatsPlayers.concat(statsPlayersForLeague);
  }

  // Compare to local database
  const playerIds = allStatsPlayers.map(player => player.playerId);
  const matchingProPlayers = await ProPlayer.find({
    where: {statsId: {inq: playerIds}},
  });

  // Flag any local records missing from remote dataset
  await ProPlayer.updateAll({statsId: {nin: playerIds}}, {statsActive: false});

  const proPlayers = await Promise.all(allStatsPlayers.map(async player => {
    // Does it already exist in the database?
    let matchingProPlayer = matchingProPlayers.find(proPlayer => proPlayer.statsId === player.playerId);
    if (matchingProPlayer) {
      // Update existing record
      matchingProPlayer = await matchingProPlayer.updateAttributes(player.toProPlayerData());
    } else {
      // Create new record
      matchingProPlayer = await ProPlayer.create(player.toProPlayerData());
    }

    // Associate with the league
    matchingProPlayer.proLeague(proLeaguesByStatsPlayerId[player.playerId]);

    // Associate with the team
    const matchingProTeam = await ProTeam.findOne({where: {statsId: player.team.teamId}});
    matchingProPlayer.proTeam(matchingProTeam);

    return matchingProPlayer.save();
  }));

  return proPlayers;
};
