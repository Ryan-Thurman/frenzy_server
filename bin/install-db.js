'use strict';

// Utility functions
const {promisify} = require('util');
const fs = require('fs');
const path = require('path');

const readdir = promisify(fs.readdir).bind(fs);
const readFile = promisify(fs.readFile).bind(fs);

// Constants
const INSTALL_SCRIPTS_DIR = path.join(__dirname, '../server/db/installation-scripts');
const MIGRATION_DIR = path.join(__dirname, '../server/db/migrations');

// Exports for testing
module.exports = {
  migrate,
  addForeignKeyConstraints,
  markAllMigrationsComplete,
};

// Start migration if run from the CLI: `node bin/automigrate.js`
if (require.main === module) {
  // Don't allow the script to crash silently
  process.on('uncaughtException', _handleError);
  process.on('unhandledRejection', _handleError);

  const app = require('../server/server');
  console.log(app.dataSource.postgresDb)
  migrate(app, app.dataSources.postgresDb);

  function _handleError(err) {
    console.error('Uncaught Exception:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

/**
 * Recreate the database for a single datasource
 * from scratch according to this process:
 *   1. Drop all model tables
 *   2. Recreate all tables
 *   3. Add foreign key constraints for all `belongsTo` relations
 * @param {Loopback.LoopbackApplication} app
 * @param {Loopback.DataSource} dataSource
 */
async function migrate(app, dataSource) {
  const connector = dataSource.connector;

  // Create query functions
  const automigrate = promisify(dataSource.automigrate).bind(dataSource);
  const execute = promisify(connector.execute).bind(connector);

  console.log('Beginning automatic database migration...');

  // Destroy all tables
  await execute(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  // Fetch relevant models
  const models = app.models().filter(Model => Model.dataSource === dataSource);

  // Create new tables
  for (const {modelName} of models) {
    await automigrate(modelName);
  }

  // Add FK constraints
  for (const Model of models) {
    await addForeignKeyConstraints(Model, connector);
  }

  // Run installation scripts
  const installationScripts = await loadAllSqlQueriesFrom(INSTALL_SCRIPTS_DIR);
  for (const query of installationScripts) await execute(query);

  // Mark migrations as complete
  await markAllMigrationsComplete(app.models.Migration, MIGRATION_DIR);

  console.log('Done!');
  process.exit(0);
}

/**
 * Adds DB constraints for all `belongsTo` relations on the given model
 * @param {Loopback.PersistedModel} Model
 * @param {Loopback.Connector} connector
 */
async function addForeignKeyConstraints(Model, connector) {
  const execute = promisify(connector.execute).bind(connector);

  for (const relation of Object.values(Model.relations)) {
    if (relation.type !== 'belongsTo') continue;
    if (relation.modelTo.dataSource !== relation.modelFrom.dataSource) continue;

    const querySql = _createQueryString(
      relation.modelFrom.modelName,
      relation.keyFrom,
      relation.modelTo.modelName,
      relation.keyTo,
      relation.options
    );

    await execute(querySql);
  }

  function _createQueryString(
    fkTable,
    fkColumn,
    targetTable,
    targetColumnName,
    options
  ) {
    let onDelete = 'CASCADE';
    if (options.onDelete === 'set null') {
      onDelete = 'SET NULL';
    }
    let onUpdate = 'CASCADE';
    if (options.onUpdate === 'set null') {
      onUpdate = 'SET NULL';
    }
    return `
      ALTER TABLE ${connector.tableEscaped(fkTable)}
      ADD FOREIGN KEY (${connector.columnEscaped(fkTable, fkColumn)})
      REFERENCES ${connector.tableEscaped(targetTable)}
        (${connector.columnEscaped(targetTable, targetColumnName)})
      ON DELETE ${onDelete}
      ON UPDATE ${onUpdate};
    `.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Fills the migrations table with a list of all existing migrations.
 * This prevents past migrations being run after a fresh install to the latest schema.
 * @param {Loopback.ModelDefinition} Migration The loopback Migration model
 * @param {string} migrationDir The relative path to the migrations directory
 * @returns {Promise}
 */
async function markAllMigrationsComplete(Migration, migrationDir) {
  // Get list of migrations to run
  const migrations = (await readdir(migrationDir))
    .filter(fileName => fileName.endsWith('.js'))
    .sort()
    .map(fileName => ({name: fileName.slice(0, -3), 'run_on': new Date()}));

  // Run the queries
  for (const migration of migrations) {
    await Migration.create(migration);
  }
}

/**
 * Retrieves all of the SQL scripts from the given directory
 * @param {string} dir The relative path to the directory
 * @returns {Promise<Array<string>>} An array of queries
 */
async function loadAllSqlQueriesFrom(dir) {
  const queryFiles = (await readdir(dir));

  const queries = [];
  for (const fileName of queryFiles) {
    if (!fileName.endsWith('.sql')) continue;
    let query = await readFile(path.join(dir, fileName));
    if (query instanceof Buffer) query = query.toString();
    queries.push(query);
  }

  return queries;
}
