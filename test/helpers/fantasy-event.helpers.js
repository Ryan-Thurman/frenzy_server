'use strict';

const app = require('../../server/server');

function givenFantasyEventData(data) {
  return Object.assign({
    winnerId: null,
  }, data);
}

async function givenFantasyEvent(data) {
  return app.models.FantasyEvent.create(givenFantasyEventData(data));
}

function givenFantasyEventPlayerStatsData(data) {
  return Object.assign({
    minutesPlayed: 90,
    proEventsPlayed: 1,
    minutesPerProEvent: 90,
    points: 50.5,
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
    passCompletionPercentage: 100,
    redCards: 1,
    yellowCards: 2,
    offsides: 3,
    interceptions: 2,
    blocks: 1,
    cleanSheets: 0,
  }, data);
}

async function givenFantasyEventPlayerStats(data) {
  return app.models.FantasyEventPlayerStats.create(givenFantasyEventPlayerStatsData(data));
}

/**
 * Generates a fantasy event and attaches to related data
 */
class MockFantasyEventBuilder {
  constructor() {
    this._fantasyTeams = [];
    this._fantasyEventData = {};
  }

  withFantasyEventData(data) {
    this._fantasyEventData = data;
    return this;
  }

  withParticipatingFantasyTeams(teams) {
    this._fantasyTeams = teams;
    return this;
  }

  async buildAndPersist() {
    const fantasyEvent = await givenFantasyEvent(this._fantasyEventData);
    for (const fantasyTeam of this._fantasyTeams) {
      await app.models.FantasyEventTeam.create({
        fantasyEventId: fantasyEvent.id,
        fantasyTeamId: fantasyTeam.id,
      });
    }
    return fantasyEvent;
  }
}

module.exports = {
  givenFantasyEventData,
  givenFantasyEvent,
  givenFantasyEventPlayerStatsData,
  givenFantasyEventPlayerStats,
  MockFantasyEventBuilder,
};
