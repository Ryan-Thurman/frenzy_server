'use strict';

const app = require('../server/server');
const {updateEventSchedule} = require('../server/lib/event-schedule-updater');
const env = require('dotenv');
const moment = require('moment');
const ProLeagueFilter = require('../server/lib/stats-roster-importer/pro-league-filter');

if (require.main === module) {
  // Load .env file contents into process.env
  env.config();

  run();
}

async function run() {
  try {
    const proLeagues = await ProLeagueFilter.fetchFilteredProLeagues(app);

    let updatedEvents;

    // Special handling of World Cup 2018
    if (proLeagues.length === 1 && proLeagues[0].statsPath === 'natl') {
      updatedEvents = await updateEventSchedule({
        app,
        proLeagues,
        startDate: moment('2018-06-14', 'YYYY-MM-DD'),
        endDate: moment('2018-07-15', 'YYYY-MM-DD'),
      });
    } else {
      updatedEvents = await updateEventSchedule({app, proLeagues});
    }

    console.log('Updated %d events', updatedEvents.length);
    process.exit(0);
  } catch (err) {
    console.error('Uncaught Exception:', err.message);
    if (err.stack) console.error(err.stack);
    console.error(err);
    process.exit(1);
  }
}
