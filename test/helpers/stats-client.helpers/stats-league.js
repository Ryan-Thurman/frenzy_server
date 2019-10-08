'use strict';

const {StatsLeague} = require('../../../server/lib/stats-client');

module.exports = {
  givenStatsLeague,
};

/**
 * Data builder for a StatsLeague
 * @param {Object} data Properties to assign the instance
 * @return {StatsLeague}
 */
function givenStatsLeague(data) {
  return new StatsLeague(Object.assign({
    leagueId: 1,
    name: 'Test League',
    abbreviation: 'ABC',
    displayName: 'Test League Display Name',
    uriPaths: [
      {pathSequence: 1, path: 'abc'},
    ],
  }, data));
}
