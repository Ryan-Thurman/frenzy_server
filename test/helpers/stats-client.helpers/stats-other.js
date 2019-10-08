/** Second-class stats model builders like country, venue, etc. */
'use strict';

module.exports = {
  givenStatsCountry,
  givenStatsVenue,
  givenStatsDate,
};

/**
 * Data builder for a Stats country (no local wrapper class)
 * @param {Object} data Properties to assign the instance
 * @return {Object}
 */
function givenStatsCountry(data) {
  return Object.assign({
    countryId: 1,
    name: 'Test Country',
    abbreviation: 'TESTC',
  }, data);
}

/**
 * Data builder for a Stats venue (no local wrapper class)
 * @param {Object} data Properties to assign the instance
 * @return {Object}
 */
function givenStatsVenue(data) {
  return Object.assign({
    venueId: 1,
    name: 'Test Venue',
    city: 'Test City',
    country: givenStatsCountry(),
  }, data);
}

function givenStatsDate(data) {
  return Object.assign({
    year: 2018,
    month: 4,
    date: 8,
    hour: 13,
    minute: 15,
    full: '2018-04-08T13:15:00',
    dateType: 'UTC',
  }, data);
}
