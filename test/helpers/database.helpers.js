'use strict';

const app = require('../../server/server');

module.exports = {givenEmptyDatabase};

async function givenEmptyDatabase() {
  const models = app.models().filter(Model => Model.dataSource === app.dataSources.postgresDb);

  for (const Model of models) {
    await Model.destroyAll();
  }
}
