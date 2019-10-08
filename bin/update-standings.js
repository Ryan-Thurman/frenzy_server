'use strict';

const app = require('../server/server');
const updateStandings = require('../server/lib/standings-updater');
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

    const updatedTeams = await updateStandings(app, whitelist, blacklist);

    console.log('Imported data for %d teams', updatedTeams.length);
    process.exit(0);
  } catch (err) {
    console.error('Uncaught Exception:', err.message);
    if (err.stack) console.error(err.stack);
    console.error(err);
    process.exit(1);
  }
}
