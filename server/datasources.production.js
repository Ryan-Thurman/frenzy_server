'use strict';

module.exports = {
  db: {
    name: 'db',
    connector: 'memory',
  },
  postgresDb: {
    host: process.env.RDS_HOSTNAME,
    port: process.env.RDS_PORT || 5432,
    database: process.env.RDS_DB_NAME,
    password: process.env.RDS_PASSWORD,
    name: 'postgresDb',
    user: process.env.RDS_USERNAME,
    connector: 'postgresql',
  },
};
