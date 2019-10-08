'use strict';

const app = require('../../../../server/server');
const expect = require('../../../helpers/expect-preconfigured');
const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {
  givenSocket,
  givenAuthenticatedCustomerSocket,
  givenRunningServer,
  closeRunningServer,
} = require('../../../helpers/realtime-server.helpers');

describe('integration: realtime-server', () => {
  beforeEach(givenEmptyDatabase);

  let httpServerAddress, httpServer;
  beforeEach('given running realtime server', async () => {
    ({httpServerAddress, httpServer} = await givenRunningServer(app));
  });

  afterEach(closeRunningServer);

  it('should authenticate with a valid AccessToken', async () => {
    await givenAuthenticatedCustomerSocket(httpServerAddress);
  });

  it('should reject an invalid AccessToken', next => {
    const socket = givenSocket(httpServerAddress);
    socket.on('error', err => {
      expect(err).to.eql('Missing access token');
      socket.disconnect();
      next();
    });
  });
});
