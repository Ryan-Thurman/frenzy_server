'use strict';

const assert = require('assert');
const crypto = require('crypto');
const moment = require('moment');

/**
 * Generates the query params required for every API request
 */
module.exports = function generateCredentials() {
  assert(process.env.STATS_API_KEY, 'STATS_API_KEY is required');
  assert(process.env.STATS_API_SECRET, 'STATS_API_SECRET is required');

  const apiKey = process.env.STATS_API_KEY;
  const secret = process.env.STATS_API_SECRET;

  const timestamp = moment.utc().unix();
  const sig = crypto.createHash('sha256').update(apiKey + secret + timestamp).digest('hex');

  return {
    'api_key': apiKey,
    'sig': sig,
  };
};
