'use strict';

const app = require('../../server/server');
const realtimeServer = require('../../server/lib/realtime-server');

module.exports = function(DraftEvent) {
  /**
   * Sends a server-side event to all clients connected to the draft lobby for
   * a given fantasy league, and stores a record of that event in the database.
   * @param {number} fantasyLeagueId ID of the league for which to dispatch an event
   * @param {string} eventName Name of the event to dispatch
   * @param {object} eventData Arbitrary data to include with the event
   */
  DraftEvent.send = async function(fantasyLeagueId, eventName, eventData = {}) {
    const event = realtimeServer.buildEvent(eventData);
    const draftNamespace = realtimeServer.getNamespace(app.models.Draft.IO_NAMESPACE);
    draftNamespace.to(fantasyLeagueId).emit(eventName, event);
    await DraftEvent.create(Object.assign({
      eventName: eventName,
      fantasyLeagueId: fantasyLeagueId,
    }, event));
  };
};
