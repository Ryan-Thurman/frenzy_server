'use strict';

const realtimeServer = require('../lib/realtime-server');
const DraftClientEventHandlers = require('../lib/fantasy-league/draft/client-event-handlers');

module.exports = app => realtimeServer.whenInitialized(DraftClientEventHandlers.registerAll);
