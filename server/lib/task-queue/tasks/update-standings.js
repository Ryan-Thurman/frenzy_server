'use strict';

const app = require('../../../server');
const updateStandings = require('../../standings-updater');
const ProLeagueFilter = require('../../stats-roster-importer/pro-league-filter');

module.exports = async job => {
  const whitelist = await ProLeagueFilter.fetchWhitelist();
  const blacklist = await ProLeagueFilter.fetchBlacklist();
  await updateStandings(app, whitelist, blacklist);
};
