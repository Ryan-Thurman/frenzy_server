'use strict';

const app = require('../../server/server');

const {givenStatsEvent} = require('./stats-client.helpers');

module.exports = {
  givenProEventData,
  givenProEvent,
  givenProEventPlayerStatsData,
  givenProEventPlayerStats,
};

function givenProEventData(data) {
  return Object.assign(givenStatsEvent().toProEventData(), data);
}

async function givenProEvent(data) {
  return app.models.ProEvent.create(givenProEventData(data));
}

function givenProEventPlayerStatsData(data) {
  return Object.assign({
    minutesPlayed: 90,
    goals: 1,
    ownGoals: 2,
    goalsAllowed: 1,
    penaltyShots: 2,
    penaltyGoals: 1,
    clears: 2,
    foulsCommitted: 1,
    assists: 2,
    tackles: 1,
    saves: 2,
    keyPasses: 1,
    passesAttempted: 2,
    passesCompleted: 2,
    redCards: 1,
    yellowCards: 2,
    offsides: 3,
    interceptions: 2,
    blocks: 1,
  }, data);
}

async function givenProEventPlayerStats(data) {
  return app.models.ProEventPlayerStats.create(givenProEventPlayerStatsData(data));
}
