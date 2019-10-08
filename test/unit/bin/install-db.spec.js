'use strict';

const sinon = require('sinon');
const {givenPersistedModelOnApp} = require('../../helpers/model.helpers');

const {
  buildDependencyGraph,
  addForeignKeyConstraints,
} = require('../../../bin/install-db');
const loopback = require('loopback');

describe('unit: install-db', () => {
  let app;
  beforeEach('given app and datasource', () => {
    app = loopback({localRegistry: true});
    app.dataSource('db', {connector: 'postgresql', lazyConnect: true});
  });

  describe('addForeignKeyConstraints', () => {
    it('create a foreign key for One:Many', async () => {
      const Author = givenPersistedModelOnApp(app, 'Author', 'db');
      const Book = givenPersistedModelOnApp(app, 'Book', 'db');

      Book.belongsTo(Author);
      Author.hasMany(Book);

      const connector = app.dataSources.db.connector;

      const expectedQuery = `
        ALTER TABLE "public"."book"
        ADD FOREIGN KEY ("authorid")
        REFERENCES "public"."author" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
      `.replace(/\s+/g, ' ').trim();

      sinon.mock(connector)
        .expects('execute')
        .once()
        .withArgs(expectedQuery)
        .callsArg(1);

      await addForeignKeyConstraints(Book, connector);
    });

    it('should create a FK with "set null" on update or delete', async () => {
      const Author = givenPersistedModelOnApp(app, 'Author', 'db');
      const Book = givenPersistedModelOnApp(app, 'Book', 'db');

      Book.belongsTo(Author, {options: {onDelete: 'set null'}});
      Author.hasMany(Book);

      const connector = app.dataSources.db.connector;

      const expectedQuery = `
        ALTER TABLE "public"."book"
        ADD FOREIGN KEY ("authorid")
        REFERENCES "public"."author" ("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      `.replace(/\s+/g, ' ').trim();

      sinon.mock(connector)
        .expects('execute')
        .once()
        .withArgs(expectedQuery)
        .callsArg(1);

      await addForeignKeyConstraints(Book, connector);
    });
    it('should only parse belongsTo relations', async () => {
      const Author = givenPersistedModelOnApp(app, 'Author', 'db');
      const Book = givenPersistedModelOnApp(app, 'Book', 'db');

      Book.belongsTo(Author);
      Author.hasMany(Book);

      const connector = app.dataSources.db.connector;
      sinon.mock(connector)
        .expects('execute')
        .never();

      await addForeignKeyConstraints(Author, connector);
    });

    it('should ignore relations across different data sources', async () => {
      app.dataSource('memoryDb', {connector: 'memory'});

      const Author = givenPersistedModelOnApp(app, 'Author', 'memoryDb');
      const Book = givenPersistedModelOnApp(app, 'Book', 'db');

      Book.belongsTo(Author);
      Author.hasMany(Book);

      const connector = app.dataSources.db.connector;
      sinon.mock(connector)
        .expects('execute')
        .never();

      await addForeignKeyConstraints(Book, connector);
    });
  });
});
