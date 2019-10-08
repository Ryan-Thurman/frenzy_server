'use strict';

const app = require('../../../server');
const {doStatsImport} = require('../../stats-roster-importer');
const ProLeagueFilter = require('../../stats-roster-importer/pro-league-filter');

module.exports = async job => {
  const whitelist = await ProLeagueFilter.fetchWhitelist();
  const blacklist = await ProLeagueFilter.fetchBlacklist();
  await doStatsImport(app, whitelist, blacklist);
};
