'use strict';

const app = require('../../../../server');
const realtimeServer = require('../../../realtime-server');

const {Draft} = app.models;

module.exports = {
  registerAll,
};

/**
 * Does something with a draft API event from the client.
 * Almost identical to the callback we'd pass directly to `socket.on()`
 * but we have to pass the socket reference in as the first arg, too.
 * @callback draftApiEventHandler
 * @param {SocketIO.Socket} socket Client socket that sent the request
 * @param {RealtimeAPIEvent} event Event data packet sent from client
 * @param {(response: RealtimeAPIEventResponse) => {}} sendResponse Callback that sends a response packet back to client
 * @return {Promise}
 */

/**
 * Mapping of event names to their handler functions
 * @type {Object.<string, draftApiEventHandler>}
 */
const HANDLERS = {
  joinDraftLobby: require('./join-draft-lobby'),
  pickPlayer: require('./pick-player'),
};

/**
 * Sets up event listeners for all of the client-sent draft API commands
 */
function registerAll() {
  const draftNamespace = realtimeServer.getNamespace(Draft.IO_NAMESPACE);

  draftNamespace.on('connection', socket => {
    // Iterate over each event, set up some common boilerplate,
    // and register it with the correct handler function
    for (const [eventName, handler] of Object.entries(HANDLERS)) {
      socket.on(eventName, async (event, sendResponse = Function()) => {
        // Make sure errors aren't silently swallowed
        try {
          // Validate the schema
          realtimeServer.validateEventSchema(event);

          await handler(socket, event, sendResponse).catch(e => { throw e; });
        } catch (e) {
          if (e instanceof realtimeServer.InvalidEventSchemaError)
            return sendResponse(realtimeServer.buildResponse(event, false, e.message));

          console.error(e);
        }
      });
    }
  });
}
