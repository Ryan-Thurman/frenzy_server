'use strict';

const app = require('../../server/server');
const {defaultsDeep} = require('lodash');
const realtimeServer = require('../../server/lib/realtime-server');

module.exports = {
  givenDraftEventData,
  givenDraftEvent,
  givenCustomerInDraftLobby,
};

function givenDraftEventData(data) {
  return defaultsDeep(data, {
    data: {},
  });
}

async function givenDraftEvent(data) {
  return app.models.DraftEvent.create(givenDraftEventData(data));
}

/**
 * Connects the provided customerSocket to the draft lobby for the fantasy league
 * @param {SocketIOClient.Socket} customerSocket
 * @param {FantasyLeague} fantasyLeague
 */
async function givenCustomerInDraftLobby(customerSocket, fantasyLeague) {
  await new Promise((resolve, reject) => {
    customerSocket.emit(
      'joinDraftLobby',
      realtimeServer.buildEvent({
        fantasyLeagueId: fantasyLeague.id,
      }),
      response => resolve(),
    );
    customerSocket.on('error', reject);
  });
}
