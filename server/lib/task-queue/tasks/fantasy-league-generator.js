'use strict';

const app = require('../../../server');
const {generateAllWeeklyLeagues} = require('../../fantasy-league/league-generator');
const ProLeagueFilter = require('../../stats-roster-importer/pro-league-filter');

module.exports = async job => {
  const whitelist = await ProLeagueFilter.fetchFilteredProLeagues(app);
  await generateAllWeeklyLeagues(whitelist);
};
