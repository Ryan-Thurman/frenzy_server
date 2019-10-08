'use strict';

const debug = require('debug')('frenzy:realtime-server');
const {get} = require('lodash');
const {promisify} = require('util');

/**
 * Middleware function to assert that the given socket has a valid access token
 * @param {l.LoopbackApplication} app App from which to load the AccessToken model
 * @param {SocketIO.Socket} socket
 * @param {function} next
 */
module.exports.authenticateSocket = async function(app, socket, next) {
  const queryToken = get(socket.handshake.query, 'token');

  if (!queryToken) {
    const e = new Error('Missing access token');
    e.status = e.statusCode = 401;
    return next(e);
  }

  const {AccessToken, Customer} = app.models;
  const resolveToken = promisify(AccessToken.resolve).bind(AccessToken);

  try {
    const matchingToken = await resolveToken(queryToken);

    if (!matchingToken) {
      const e = new Error('Invalid access token');
      e.status = e.statusCode = 401;
      return next(e);
    }

    const user = await Customer.findById(matchingToken.userId);
    socket.client.user = user;

    debug('user %s authenticated', user.id);

    next();
  } catch (e) {
    next(e);
  }
};
