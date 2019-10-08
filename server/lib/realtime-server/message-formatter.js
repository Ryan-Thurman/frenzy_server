'use strict';

const moment = require('moment');
const uuidv4 = require('uuid/v4');

/**
 * @prop {string} id UUID to identify this event
 * @prop {string} at ISO-formatted date/timestamp with ms-precision
 * @prop {Object} data Data payload, varies by event
 */
class RealtimeAPIEvent {
  constructor(data) {
    this.id = uuidv4();
    this.at = new Date().toISOString();
    this.data = data;
  }
}

/**
 *
 * @param {Object} eventData
 */
module.exports.buildEvent = function buildEvent(eventData) {
  return new RealtimeAPIEvent(eventData);
};

/**
 * @prop {string} originalEventID ID of the event this response belongs to
 * @prop {boolean} success Whether or not the request was successful
 * @prop {string} [message] Additional details about a failure
 */
class RealtimeAPIEventResponse {
  constructor(event, success, message) {
    this.originalEventID = event ? event.id : null;
    this.success = success;
    this.message = message ? message : null;
  }
}

/**
 * Builds a standardized API response object
 * @see RealtimeAPIEventResponse
 * @param {RealtimeAPIEvent|Object} event
 * @param {boolean} success
 * @param {string} [message]
 * @returns {RealtimeAPIEventResponse}
 */
module.exports.buildResponse = function buildResponse(event, success, message) {
  return new RealtimeAPIEventResponse(event, success, message);
};

class InvalidEventSchemaError extends Error {}

/**
 * Throws an `InvalidEventSchemaError` if the passed event doesn't match the correct schema
 * @param {RealtimeAPIEvent|Object} event Event to validate
 */
module.exports.validateEventSchema = function validateEventSchema(event) {
  if (!event.id)
    throw new InvalidEventSchemaError('Event is missing a identifier `event.id`');
  if (!event.at)
    throw new InvalidEventSchemaError('Event is missing timestamp `event.at`');
  if (!moment(event.at, 'YYYY-MM-DDTHH:mm:ss.SSSSZ', true).isValid())
    throw new InvalidEventSchemaError('Event timestamp `event.at` is in the incorrect format');
  if (!event.data)
    throw new InvalidEventSchemaError('Event is missing payload `event.data`');
};

module.exports.InvalidEventSchemaError = InvalidEventSchemaError;
