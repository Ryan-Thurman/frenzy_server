'use strict';

const {StatsTeam} = require('../../../server/lib/stats-client');
const {
  givenStatsCountry,
  givenStatsVenue,
} = require('./stats-other');

module.exports = {
  givenStatsTeam,
};

/**
 * Data builder for a StatsTeam
 * @param {Object} data Properties to assign the instance
 * @return {StatsTeam}
 */
function givenStatsTeam(data) {
  return new StatsTeam(Object.assign({
    venue: givenStatsVenue(),
    teamId: 10,
    location: 'Test Team Location',
    abbreviation: 'TESTTEAM',
    displayName: 'Test Team Display Name',
    teamTypeId: 0,
    country: givenStatsCountry(),
  }, data));
}
