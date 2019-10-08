'use strict';

module.exports = {
  givenPersistedModelOnApp,
};

function givenPersistedModelOnApp(app, modelName, dataSourceName) {
  const Model = app.registry.createModel({
    name: modelName,
    base: 'PersistedModel',
  });
  app.model(Model, {dataSource: dataSourceName});
  return Model;
}
