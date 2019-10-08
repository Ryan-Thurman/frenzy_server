'use strict';

module.exports = async function(app, callback) {
  await app.models.Lineup.populate();
  callback();
};
