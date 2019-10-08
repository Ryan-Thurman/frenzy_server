/**
 * @module statsClient
 * @description
 * Provides low-level interactions with the Stats.com API.
 * Note: I did a lot of research into using loopback-connector-rest
 * and found it was simply not flexible or well-documented enough for the task.
 */

'use strict';

const generateCredentials = require('./generate-credentials');
const {request, BASE_URL} = require('./request');
const StatsLeague = require('./stats-league');
const StatsTeam = require('./stats-team');
const StatsPlayer = require('./stats-player');
const StatsEvent = require('./stats-event');

module.exports = {
  generateCredentials,
  request,
  BASE_URL,
  StatsLeague,
  StatsTeam,
  StatsPlayer,
  StatsEvent,
};
