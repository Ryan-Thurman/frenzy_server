'use strict';

const app = require('../../server/server');

module.exports = {
  givenProLeagueData,
  givenProLeague,
};

function givenProLeagueData(data) {
  return Object.assign({
    name: 'Test Pro League',
  }, data);
}

async function givenProLeague(data) {
  return app.models.ProLeague.create(givenProLeagueData(data));
}
