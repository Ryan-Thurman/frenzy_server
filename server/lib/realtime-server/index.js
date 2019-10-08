'use strict';

const messageFormatter = require('./message-formatter');
const {authenticateSocket} = require('./auth');
const debug = require('debug')('frenzy:realtime-server');
const Server = require('socket.io');
const redisAdapter = require('socket.io-redis');
const Redis = require('ioredis');
const {promisify} = require('util');
const onApplicationShutdown = require('death');

/**
 * Singleton class that manages the socket.io server and realtime data streams
 * @property {SocketIO.Server} io The socket.io server instance
 */
class RealtimeServer {
  constructor() {
    /**
     * Callbacks to run after init()
     * @type {Array<Function>}
     * @see RealtimeServer#whenInitialized
     */
    this._postInitCallbacks = [];

    /**
     * Cache of preconfigured namespaces
     * @type {Object<string, SocketIO.Namespace>}
     */
    this._nspCache = {};

    // Copy members from messageFormatter
    this.buildEvent = messageFormatter.buildEvent;
    this.buildResponse = messageFormatter.buildResponse;
    this.validateEventSchema = messageFormatter.validateEventSchema;
    this.InvalidEventSchemaError = messageFormatter.InvalidEventSchemaError;
  }

  /**
   * Initialize socket.io
   * @param {l.LoopbackApplication} app
   * @param {http.Server} httpServer
   */
  async init(app, httpServer) {
    debug('init');

    this._app = app;
    this._server = httpServer;

    /** @type {IORedis.RedisOptions} */
    const redisOpts = {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASS,
      lazyConnect: true,
    };

    const redisPubClient = new Redis(redisOpts);
    const redisSubClient = new Redis(redisOpts);
    await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);

    this.io = new Server(httpServer, {
      adapter: redisAdapter({
        pubClient: redisPubClient,
        subClient: redisSubClient,
      }),
    });

    // Pre-configure the default namespace
    this.getNamespace();

    // Run post-init callbacks
    for (const callback of this._postInitCallbacks) callback(this.io);

    // Register debug events
    if (debug.enabled) {
      this.io.on('connection', socket => {
        debug('a user connected');
        socket.on('disconnect', () => {
          debug('user disconnected');
        });
      });
    }

    // Cleanly shut down the server when application is killed via SIGINT, SIGSTOP, or SIGTERM
    // Note: This handler assumes it is the only such callback in the app.
    //       Consider refactoring if some other module requires similar behavior.
    onApplicationShutdown(async () => {
      debug('shutting down cleanly before exit');

      try {
        await this.close();
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      } finally {
        process.exit();
      }
    });
  }

  /**
   * Gets a reference to a namespace, lazily configuring it in the process if needed
   * @param {string} [path] Namespace path, example: `'/draft'`. Defaults to `'/'`.
   * @returns {SocketIO.Namespace}
   */
  getNamespace(path = '/') {
    if (this._nspCache[path]) return this._nspCache[path];

    const nsp = this.io.of(path);

    // Configure authentication
    nsp.use((socket, next) => authenticateSocket(this._app, socket, next));

    // Add to cache
    this._nspCache[path] = nsp;

    return nsp;
  }

  /**
   * Allows code execution to be delayed until the RealtimeServer initializes.
   * If the server has already been initialized, callback runs immediately.
   * Otherwise, the callback runs after init.
   *
   * *NOTE:* These callbacks are preserved even if the server is shut down via `close()`.
   * @param {function(SocketIO.Server)} callback Called with `this.io` as the first arg
   */
  whenInitialized(callback) {
    if (this.isInitialized()) {
      callback(this.io);
    } else {
      this._postInitCallbacks.push(callback);
    }
  }

  /**
   * @returns {boolean} Whether the server is active and ready to process messages
   */
  isInitialized() {
    return Boolean(this.io);
  }

  /**
   * Close the socket.io server and disconnect all clients
   * @return {Promise}
   */
  async close() {
    const adapter = this.io.of('/').adapter;
    const getClientIds = promisify(adapter.clients).bind(adapter);
    const disconnectClientById = promisify(adapter.remoteDisconnect).bind(adapter);
    const closeServer = promisify(this.io.close).bind(this.io);

    debug('closing server');

    for (const clientId of await getClientIds()) {
      debug('shutting down client %s', clientId);
      await disconnectClientById(clientId, true);
    }

    const pubClient = adapter.pubClient;
    const subClient = adapter.subClient;

    await closeServer();
    await pubClient.quit();
    await subClient.quit();

    // Reset state
    delete this.io;
    this._nspCache = {};

    debug('server closed');
  }
}

module.exports = new RealtimeServer();
