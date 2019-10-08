'use strict';

const importLeagues = require('./import-leagues');
const importTeams = require('./import-teams');
const importPlayers = require('./import-players');

module.exports = {
  doStatsImport,
};

/**
 * Refresh the contents of ProLeague, ProTeam, and ProPlayer tables
 * using data from the Stats.com API server
 * @param {Loopback.LoopbackApplication} app
 * @param {Array<string>} [whitelist] Only load leagues with the specified `leaguePath`s.
 * @param {Array<string>} [whitelist] Ignore leagues with the specified `leaguePath`s.
 * @return {Promise<Number>} The number of records affected
 */
async function doStatsImport(app, whitelist = [], blacklist = []) {
  let updatedCount;
  await app.dataSources.postgresDb.transaction(async models => {
    console.log('Importing leagues...');
    const updatedProLeagues = await importLeagues({models}, whitelist, blacklist);
    const leaguesToImport = updatedProLeagues.filter(l => l.statsActive);

    console.log('Importing teams...');
    const updatedProTeams = await importTeams({models}, leaguesToImport);

    console.log('Importing players...');
    const updatedProPlayers = await importPlayers({models}, leaguesToImport);

    updatedCount = updatedProLeagues.length + updatedProTeams.length + updatedProPlayers.length;
  });
  return updatedCount;
}
