'use strict';

module.exports = function(Model, options) {
  // Make model immutable via REST
  Model.disableRemoteMethodByName('replaceOrCreate'); // Removes (PUT) /model
  Model.disableRemoteMethodByName('upsert'); // Removes (PUT) /model
  Model.disableRemoteMethodByName('updateAll'); // Removes (POST) /model/update
  Model.disableRemoteMethodByName('replaceById'); // Removes (PUT) /model/:ud
  Model.disableRemoteMethodByName('prototype.patchAttributes'); // Removes (PUT) /model/:id
  Model.disableRemoteMethodByName('createChangeStream'); // Removes (GET|POST) /model/change-stream
  Model.disableRemoteMethodByName('upsertWithWhere'); // Removes (POST) /model/upsert-with-where
};
