'use strict';

const BASE_URL = 'http://api.stats.com/v1/stats/soccer/';
const NUM_RETRIES = 5;

const _request = require('request-promise-native').defaults({
  baseUrl: BASE_URL,
  json: true,
});

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * A customized version of request that retries failed requests
 * with exponential falloff.
 * @param {Request.CoreOptions} opts Options to pass to request
 * @returns {Promise<object>} Response body
 */
const request = async function(opts) {
  let lastError;
  for (let attempt = 1; attempt <= NUM_RETRIES; attempt++) {
    if (lastError)
      await timeout(getExponentialBackoff(attempt));

    try {
      return _request(opts);
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError;
};

module.exports = {
  BASE_URL,
  request,
};

/**
 * @param   {Number} attempt The number of times that the request has been attempted.
 * @return  {Number} number of milliseconds to wait before retrying again the request.
 */
function getExponentialBackoff(attempt) {
  return (Math.pow(2, attempt) * 100) + Math.floor(Math.random() * 50);
}
