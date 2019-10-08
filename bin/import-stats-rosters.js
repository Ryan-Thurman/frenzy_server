'use strict';

const app = require('../server/server');
const {doStatsImport} = require('../server/lib/stats-roster-importer');
const env = require('dotenv');
const ProLeagueFilter = require('../server/lib/stats-roster-importer/pro-league-filter');

if (require.main === module) {
  // Load .env file contents into process.env
  env.config();

  run();
}

async function run() {
  try {
    const whitelist = await ProLeagueFilter.fetchWhitelist();
    const blacklist = await ProLeagueFilter.fetchBlacklist();
    const recordCount = await doStatsImport(app, whitelist, blacklist);
    console.log('Imported %d records', recordCount);
    process.exit(0);
  } catch (err) {
    console.error('Uncaught Exception:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}
