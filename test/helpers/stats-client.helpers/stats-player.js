'use strict';

const {StatsPlayer} = require('../../../server/lib/stats-client');
const {givenStatsCountry} = require('./stats-other');

module.exports = {
  givenStatsPlayer,
};

/**
 * Data builder for a StatsPlayer
 * @param {Object} data Properties to assign the instance
 * @return {StatsPlayer}
 */
function givenStatsPlayer(data) {
  return new StatsPlayer(Object.assign({
    team: {
      displayName: 'Test Team Display Name',
      teamId: 10,
      location: 'Test Team Location',
      nickname: null,
      abbreviation: 'TESTTEAM',
    },
    playerId: 100,
    firstName: 'Firstname',
    lastName: 'Lastname',
    fullFirst: 'Full-Firstname',
    fullLast: 'Full-Lastname',
    displayId: 0,
    displayName: 'Firstname Lastname',
    uniform: '01',
    height: {
      centimeters: 178.0,
      inches: 70.0,
    },
    weight: {
      kilograms: 70.0,
      pounds: 154.0,
    },
    birth: {
      birthDate: {
        year: 1988,
        month: 11,
        date: 1,
        full: '1988-11-01',
      },
      city: 'Test City',
      country: givenStatsCountry(),
    },
    nationality: givenStatsCountry(),
    positions: [{
      positionId: 3,
      name: 'Midfielder',
      abbreviation: 'M',
      sequence: 1,
    }],
    hometown: {},
  }, data));
}
