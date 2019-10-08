'use strict';

const assert = require('assert');
const {StatsLeague} = require('../stats-client');

/**
 * Updates local ProLeague table from Stats.com API server
 * @param {Loopback.LoopbackApplication|Object} app A Loopback application instance
 *   or just an object with a property `models` containing the ProLeague model.
 * @param {Array<string>} [whitelist] Only load leagues with the specified `leaguePath`s.
 * @param {Array<string>} [blacklist] Ignore leagues with the specified `leaguePath`s.
 * @return {Promise<Array<ProLeague>>} Newly created or updated leagues
 */
module.exports = async function importLeagues(app, whitelist = [], blacklist = []) {
  const {ProLeague} = app.models;

  // Fetch remote data
  let statsLeagues = await StatsLeague.query();

  // Filter results
  statsLeagues = statsLeagues.filter(league => {
    return (whitelist.length === 0 || whitelist.includes(league.path)) &&
      !blacklist.includes(league.path);
  });

  assert(statsLeagues.length, 'StatsLeague.query should not return an empty result');

  // Compare to local database
  const leaguePaths = statsLeagues.map(league => league.path);
  const matchingProLeagues = await ProLeague.find({
    where: {statsPath: {inq: leaguePaths}},
  });

  // Flag any local records missing from remote dataset
  await ProLeague.updateAll({statsPath: {nin: leaguePaths}}, {statsActive: false});

  const proLeagues = await Promise.all(statsLeagues.map(async league => {
    // Does it already exist in the database?
    const matchingProLeague = matchingProLeagues.find(proLeague => proLeague.statsPath === league.path);
    if (matchingProLeague) {
      // Update existing record
      return matchingProLeague.updateAttributes(league.toProLeagueData());
    } else {
      // Create new record
      return ProLeague.create(league.toProLeagueData());
    }
  }));

  return proLeagues;
};
