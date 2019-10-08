'use strict';

const app = require('../../server/server');

module.exports = {
  givenProPlayerData,
  givenProPlayer,
};

function givenProPlayerData(data) {
  return Object.assign({
    name: 'Test Pro Player',
    statsId: 1000,
    position: 'M',
  }, data);
}

async function givenProPlayer(data) {
  return app.models.ProPlayer.create(givenProPlayerData(data));
}
