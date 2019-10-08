'use strict';

const io = require('socket.io-client');
const {givenLoggedInCustomer} = require('./customer.helpers');
const {promisify} = require('util');
const realtimeServer = require('../../server/lib/realtime-server');
const http = require('http');

module.exports = {
  givenSocket,
  givenAuthenticatedCustomerSocket,
  givenRunningServer,
  closeRunningServer,
};

/**
 * Get a socket client preconfigured with some options
 * @param {string} uri The uri that we'll connect to, including the namespace,
 * where '/' is the default one (e.g. http://localhost:4000/somenamespace)
 * @param {SocketIOClient.ConnectOpts} options
 * @returns {io}
 */
function givenSocket(uri, options) {
  return io(uri, Object.assign({
    // Prevent interaction between tests
    forceNew: true,

    // Client will keep trying to reconnect if something goes wrong with tests
    reconnection: false,

    // Client never shuts down when the server is closed after the test,
    // unless transport is set to only websockets.
    // https://github.com/socketio/engine.io-client/issues/598
    transports: ['websocket'],
  }, options));
}

/**
 * Generates a new logged in customer with an authenticated socket client
 * @param {string} uri The uri that we'll connect to, including the namespace,
 * where '/' is the default one (e.g. http://localhost:4000/somenamespace)
 * @param {object} [customerData] Properties to assigne to new customer object
 * @returns {Promise<{socket: io, token: AccessToken, customer: Customer}>}
 */
async function givenAuthenticatedCustomerSocket(uri, customerData = {}) {
  const {token, customer} = await givenLoggedInCustomer(customerData);

  const socket = givenSocket(uri, {
    query: {token: token.id},
  });

  let cleanupListeners;
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('unauthorized', reject);
    socket.once('error', reject);
    socket.once('connect_error', reject);
    socket.once('connect_timeout', reject);

    cleanupListeners = () => {
      socket.off('connect', resolve);
      socket.off('unauthorized', reject);
      socket.off('error', reject);
      socket.off('connect_error', reject);
      socket.off('connect_timeout', reject);
    };
  }).catch(e => {
    console.error(e);
    throw e;
  });
  cleanupListeners();

  return {
    socket,
    token,
    customer,
  };
}

/**
 * Initializes the realtime server using the provided app
 * @param {l.LoopbackApplication} app
 * @returns {Promise<{httpServer: http.Server, httpServerAddress: string}>}
 */
async function givenRunningServer(app) {
  const httpServer = new http.Server();
  await promisify(httpServer.listen).bind(httpServer)();
  const {port} = httpServer.address();
  const httpServerAddress = `ws://localhost:${port}`;
  await realtimeServer.init(app, httpServer);

  return {
    httpServer,
    httpServerAddress,
  };
}

/**
 * Cleanly shut down the realtime server
 */
async function closeRunningServer() {
  return realtimeServer.close();
}
