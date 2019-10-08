'use strict';

const app = require('../../../server');
const {updateEventSchedule} = require('../../event-schedule-updater');
const ProLeagueFilter = require('../../stats-roster-importer/pro-league-filter');
const moment = require('moment');

module.exports = async job => {
  const proLeagues = await ProLeagueFilter.fetchFilteredProLeagues(app);

  // Special handling of World Cup 2018
  if (proLeagues.length === 1 && proLeagues[0].statsPath === 'natl') {
    await updateEventSchedule({
      app,
      proLeagues,
      startDate: moment('2018-06-14', 'YYYY-MM-DD'),
      endDate: moment('2018-07-15', 'YYYY-MM-DD'),
    });
    return;
  }

  // Default behavior
  await updateEventSchedule({
    app,
    proLeagues,
  });
};
