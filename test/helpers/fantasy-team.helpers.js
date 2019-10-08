'use strict';

const app = require('../../server/server');

const {
  givenFantasyLeague,
  givenFantasyLeagueData,
} = require('./fantasy-league.helpers');

module.exports = {
  givenFantasyTeamData,
  givenFantasyTeam,
};

function givenFantasyTeamData(data) {
  return Object.assign({
    name: 'Test Team',
    lineupId: null,
  }, data);
}

async function givenFantasyTeam(data) {
  return app.models.FantasyTeam.create(givenFantasyTeamData(data));
}
