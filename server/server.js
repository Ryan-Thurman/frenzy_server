'use strict';

const loopback = require('loopback');
const boot = require('loopback-boot');
const env = require('dotenv');
const realtimeServer = require('./lib/realtime-server');

// Load .env file contents into process.env
env.config();

console.log(env)

const app = module.exports = loopback();

app.start = () => {
  // start the web server
  const server = app.listen(() => {
    app.emit('started');
    const baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      const explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }

    console.log('View task queue UI at %s%s', baseUrl, '/queue');
  });

  realtimeServer.init(app, server);

  return server;
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, err => {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module) {
    app.start();
  }
});
