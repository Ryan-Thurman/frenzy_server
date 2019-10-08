'use strict';

const {times} = require('lodash');
const request = require('supertest');
const expect = require('../../../../helpers/expect-preconfigured');

const app = require('../../../../../server/server');

const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {
  givenProEventData,
  givenProEvent,
} = require('../../../../helpers/pro-event.helpers');
const {givenProLeague} = require('../../../../helpers/pro-league.helpers');

const {
  givenAuthenticatedCustomerSocket,
  givenRunningServer,
  closeRunningServer,
} = require('../../../../helpers/realtime-server.helpers');

const ProEvent = app.models.ProEvent;

describe('integration: ProEvent (realtime)', () => {
  beforeEach(givenEmptyDatabase);

  let httpServerAddress, httpServer;
  beforeEach('given running realtime server', async () => {
    ({httpServerAddress, httpServer} = await givenRunningServer(app));
  });

  afterEach(closeRunningServer);

  let socket;
  beforeEach('given authenticated socket', async () => {
    ({socket} = await givenAuthenticatedCustomerSocket(httpServerAddress + ProEvent.IO_NAMESPACE));
  });

  let proLeague;
  beforeEach('given pro league', async () => {
    proLeague = await givenProLeague();
  });

  it.skip('should send an update event when the instance is saved', async () => {
    const proEventData = givenProEventData({proLeagueId: proLeague.id});
    const proEvent = await givenProEvent(proEventData);

    socket.join(proEvent.id);

    await new Promise(async (resolve, reject) => {
      let counter = 0;

      socket.on('update', async updatedProEvent => {
        try {
          switch (counter) {
            case 0:
              expect(updatedProEvent.statsRawData).to.eql({foo: 'one'});
              counter++;
              await proEvent.updateAttribute({statsRawData: {foo: 'two'}});
              break;
            case 1:
              expect(updatedProEvent.statsRawData).to.eql({foo: 'two'});
              counter++;
              await proEvent.updateAttribute({statsRawData: {foo: 'three'}});
              break;
            case 2:
              expect(updatedProEvent.statsRawData).to.eql({foo: 'three'});
              resolve();
              break;
          }
        } catch (e) {
          reject(e);
        }
      });

      await proEvent.updateAttribute({statsRawData: {foo: 'one'}});
    });
  });
});
