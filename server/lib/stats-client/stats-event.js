'use strict';

const assert = require('assert');
const {request} = require('./request');
const {cloneDeep, isBoolean} = require('lodash');
const generateCredentials = require('./generate-credentials');
const moment = require('moment');

/**
 * @description Raw event data fetched from the Stats.com API.
 * @see {@link docs/stats-soccer-events.md} for full properties list.
 */
class StatsEvent {
  constructor(data) {
    Object.assign(this, data);

    // Validate instance
    const validMsg = 'StatsEvent instance should be valid';
    assert(this.eventId, validMsg);
  }

  /**
   * Retrieves all events from the Stats.com API for a given league.
   * Only shows events that participated in the current season.
   * @param {string} leaguePath The event's league uriPath. @see StatsLeague
   * @param {object} [params] Query params to pass along to the stats API
   * @return {Promise<Array<StatsEvent>>}
   */
  static async query(leaguePath, params) {
    return requestEvents(leaguePath, undefined, params);
  }

  /**
   * Retrieves a single event from the Stats.com API
   * @param {string} leaguePath The event's league uriPath. @see StatsLeague
   * @param {number} eventId ID of the event to load
   * @param {object} [params] Query params to pass along to the stats API
   * @param {boolean} [params.box=true] Whether to return box scores
   * @return {Promise<StatsEvent>}
   */
  static async findOne(leaguePath, eventId, params) {
    const events = await requestEvents(leaguePath, eventId, Object.assign({box: true}, params));
    return events[0];
  }

  /**
   * @return {Object} POJO with properties that can be transferred to a ProEvent instance
   */
  toProEventData() {
    // Parse the UTC start date
    const utcStartDate = this.startDate.find(statsDate => statsDate.dateType === 'UTC');
    const startDateMoment = moment.utc(utcStartDate.full);

    const output = {
      startDate: startDateMoment.toDate(),
      statsId: this.eventId,
      statsActive: true,
      statsRawData: cloneDeep(this),
    };

    // Deal with optional properties

    if (isBoolean(this.isDataConfirmed.box)) {
      output.boxDataConfirmed = this.isDataConfirmed.box;
    }
    if (isBoolean(this.isDataConfirmed.score)) {
      output.scoreConfirmed = this.isDataConfirmed.score;
    }

    if (Array.isArray(this.boxscores) && this.boxscores.length) {
      output.statsRawBoxScoreData = output.statsRawData.boxscores;
      delete output.statsRawData.boxscores;
    }

    if (Array.isArray(this.periodDetails) && this.periodDetails.length) {
      output.statsRawPeriodDetailsData = output.statsRawData.periodDetails;
      delete output.statsRawData.periodDetails;
    }

    if (this.eventRound) {
      output.round = this.eventRound.name;
    }

    return output;
  }
}

module.exports = StatsEvent;

async function requestEvents(leaguePath, eventId = '', params = {}) {
  leaguePath = leaguePath.toLowerCase();

  Object.assign(params, generateCredentials());

  // @todo separate endpoint for box scores
  const responseData = await request({
    url: `/${leaguePath}/events/${eventId}`,
    qs: params,
  });

  const events = responseData.apiResults[0].league.season.eventType
    .reduce(reduceEventTypesToEvents, [])
    .map(obj => new StatsEvent(obj));

  return events;
}

function reduceEventTypesToEvents(events, eventType) {
  return events.concat(eventType.events);
}
