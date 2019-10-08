'use strict';

const app = require('../server');
const {postgresDb} = app.datasources;

/** Dynamic configuration for node-pg-migrate */
module.exports = {
  user: postgresDb.settings.user,
  password: postgresDb.settings.password,
  host: postgresDb.settings.host,
  port: postgresDb.settings.port,
  database: postgresDb.settings.database,
};
