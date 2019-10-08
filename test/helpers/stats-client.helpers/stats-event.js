'use strict';

const {merge} = require('lodash');

const {StatsEvent} = require('../../../server/lib/stats-client');
const {
  givenStatsCountry,
  givenStatsVenue,
  givenStatsDate,
} = require('./stats-other');
const {givenStatsTeam} = require('./stats-team');

function givenStatsEvent(data) {
  return new StatsEvent(Object.assign({
    eventId: 1000,
    startDate: [
      givenStatsDate({dateType: 'Local'}),
      givenStatsDate({dateType: 'UTC'}),
    ],
    isTba: false,
    isDataConfirmed: {
      score: true,
    },
    eventStatus: {
      eventStatusId: 4,
      period: 2,
      time: {},
      isActive: false,
      defendingXZeroTeamId: null,
      name: 'Final',
    },
    venue: givenStatsVenue(),
    tvStations: [{
      tvStationId: 26,
      name: 'NBC Sports Network',
      callLetters: 'NBCS',
      networkType: {
        networkTypeId: 1,
        name: 'National',
      },
      country: givenStatsCountry(),
    }],
    teams: [givenStatsTeam({
      displayName: 'Winning Team',
      teamColors: {
        primary: '#CC0000',
        shorts: '#FFFFFF',
      },
      formation: '4231',
      shots: 13,
      shootoutGoals: 0,
      teamLocationType: {
        teamLocationTypeId: 1,
        name: 'home',
      },
      record: {
        wins: 16,
        losses: 10,
        ties: 6,
        percentage: '.594',
        points: 54,
      },
      score: 3,
      isWinner: true,
    }), givenStatsTeam({
      displayName: 'Losing Team',
      teamColors: {
        primary: '#2C5656',
        shorts: '#0080C0',
      },
      formation: '3511',
      teamId: 20,
      shots: 15,
      shootoutGoals: 0,
      abbreviation: 'LOS',
      teamLocationType: {
        teamLocationTypeId: 2,
        name: 'away',
      },
      record: {
        wins: 5,
        losses: 14,
        ties: 13,
        percentage: '.359',
        points: 28,
      },
      score: 2,
      isWinner: false,
    })],
    replay: false,
    originalWeek: 33,
    week: 33,
    coverageLevel: {
      coverageLevelId: 23,
      name: 'Tier 6',
    },
    defendingXZeroTeam: [{
      period: 1,
      teamId: 6145,
    }, {
      period: 2,
      teamId: 7128,
    }],
    weather: {},
  }, data));
}

/**
 * Generates a StatsEvent with box scores
 * Uses a chainable, fluent interface. Call `build()` method when done.
 * @example
 * ```
 * const body = new MockStatsEventBuilder
 *   .withProLeagues([givenProLeague()])
 *   .build();
 * ```
 */
class MockStatsEventBuilder {
  constructor() {
    this._statsEventData = {};
    this._proTeams = [{id: 6161}, {id: 6162}];
  }

  /**
   * Properties to assign to the mock event
   * @param {object} data
   */
  withStatsEventData(data) {
    this._statsEventData = data;
    return this;
  }

  /**
   * ProPlayers to evenly distribute among the stats team data
   * @param {Array<ProPlayer>} proPlayers
   */
  containingProPlayers(proPlayers) {
    this._proPlayers = proPlayers;
    return this;
  }

  /**
   * ProTeams participating in the event
   * @param {Array<ProTeam>} proTeams
   */
  withProTeams(proTeams) {
    this._proTeams = proTeams;
    return this;
  }

  /**
   * Generates the StatsEvent based on the instance configuration
   * @return {StatsEvent}
   */
  build() {
    if (!this._proPlayers) throw new Error('Forgot to call containingProPlayers');

    const statsEvent = givenStatsEvent();

    statsEvent.boxscores = this._proTeams.map(proTeam => {
      const playersOnTeam = this._proPlayers.filter(proPlayer => proPlayer.proTeamId === proTeam.id);
      if (playersOnTeam.length < 11) throw new Error('Not enough players for ProTeam: ' + proTeam.id);

      return new MockStatsTeamBoxScoreBuilder()
        .withProTeam(proTeam)
        .withGoalTender(playersOnTeam[0])
        .withPlayers(playersOnTeam.slice(0, 11))
        .withBenchPlayers(playersOnTeam.slice(11))
        .build();
    });
    statsEvent.periodDetails = [];

    merge(statsEvent, this._statsEventData);

    return statsEvent;
  }
}

class MockStatsTeamBoxScoreBuilder {
  constructor() {
    this._benchPlayers = [];
  }

  /**
   * @param {ProTeam} proTeam
   */
  withProTeam(proTeam) {
    this._proTeam = proTeam;
    return this;
  }

  /**
   * @param {ProPlayer} goalTender
   */
  withGoalTender(goalTender) {
    this._goalTender = goalTender;
    return this;
  }

  /**
   * @param {Array<ProPlayer>} players
   */
  withPlayers(players) {
    this._players = players;
    return this;
  }

  /**
   * @param {Array<ProPlayer>} benchPlayers
   */
  withBenchPlayers(benchPlayers) {
    this._benchPlayers = benchPlayers;
    return this;
  }

  build() {
    if (!this._proTeam) throw new Error('Forgot to call withProTeam');
    if (!this._goalTender) throw new Error('Forgot to call withGoalTender');
    if (!this._players) throw new Error('Forgot to call withPlayers');

    return {
      teamId: this._proTeam.statsId,
      teamStats: givenTeamStats(),
      goaltenders: [givenGoaltenderBoxScore({
        player: {playerId: this._goalTender.statsId},
      })],
      players: this._players.map((proPlayer, i) => {
        let position;
        if (proPlayer.id === this._goalTender.id) {
          position = givenPlayerPosition('GK');
        } else if (i <= 4) {
          position = givenPlayerPosition('D');
        } else if (i <= 7) {
          position = givenPlayerPosition('M');
        } else {
          position = givenPlayerPosition('F');
        }
        return givenPlayerBoxScore({
          player: {playerId: proPlayer.statsId},
          position: position,
        });
      }),
      benchPlayers: this._benchPlayers.map(proPlayer => {
        return givenBenchPlayerBoxScore({
          player: {playerId: proPlayer.statsId},
        });
      }),
    };
  }
}

function givenTeamStats() {
  return {
    minutesPlayed: 87,
    goals: 1,
    ownGoals: 0,
    assists: 0,
    shots: {
      total: 14,
      insideBox: null,
      outsideBox: null,
      blocked: null,
      shotResult: [{
        shotResultId: 1,
        name: 'Top/Left',
        shots: 2,
        goals: 1,
      }, {
        shotResultId: 5,
        name: 'Bottom/Center',
        shots: 1,
        goals: 0,
      }, {
        shotResultId: 6,
        name: 'Bottom/Right',
        shots: 3,
        goals: 0,
      }, {
        shotResultId: 8,
        name: 'Out Above Left',
        shots: 2,
        goals: 0,
      }, {
        shotResultId: 15,
        name: 'Hit Bar Out',
        shots: 1,
        goals: 0,
      }, {
        shotResultId: 23,
        name: 'Blocked',
        shots: 2,
        goals: 0,
      }, {
        shotResultId: 24,
        name: 'Out Wide Low Left',
        shots: 1,
        goals: 0,
      }, {
        shotResultId: 43,
        name: 'Middle/Left',
        shots: 1,
        goals: 0,
      }, {
        shotResultId: 51,
        name: 'Off Target',
        shots: 1,
        goals: 0,
      }, {
        shotResultId: null,
        name: null,
        shots: 1,
        goals: 0,
      }],
    },
    shotsOnGoal: 3,
    shotsOnGoalPercentage: '.214',
    saves: 4,
    crosses: 29,
    crossBreakdown: {
      successful: 0,
      blocked: 7,
      percentage: '.000',
    },
    penaltyKicks: {
      shots: 0,
      goals: 0,
    },
    foulsCommitted: 11,
    foulsSuffered: 8,
    yellowCards: 2,
    redCards: 0,
    offsides: 1,
    cornerKicks: 2,
    clears: 70,
    freeKick: 15,
    throwIns: 24,
    woodWork: 1,
    touches: {
      total: 536,
      passes: 276,
      passesAttempted: 350,
      passesReceived: 276,
      passesMissed: 74,
      passCompletionPercentage: '.789',
      interceptions: 11,
      blocks: 13,
      passLength: {
        short: 44,
        long: 228,
      },
      passDirection: {
        forward: 114,
        forwardPercentage: '.483',
        backward: 122,
        right: 133,
        left: 118,
      },
      passLocation: {
        ownHalf: {
          total: 133,
          attempted: 161,
          percentage: '.826',
        },
        opponentHalf: {
          total: 143,
          attempted: 189,
          percentage: '.757',
        },
      },
    },
    catches: 12,
    punches: 0,
    tackles: 23,
    attacks: {
      left: 16,
      center: 14,
      right: 17,
      longball: 0,
    },
    aerialDuels: {
      total: 25,
      won: 18,
      percentage: '.720',
    },
    groundDuels: {
      total: 9,
      won: 3,
      percentage: '.333',
    },
    possessionPercentage: '55',
    possessionPercentageBreakdown: {
      fieldHalf: {
        own: '47',
        opponent: '53',
      },
      fieldThird: {
        own: '28',
        middle: '44',
        opponent: '28',
      },
      attackingSide: {
        left: '29',
        center: '36',
        right: '35',
      },
    },
  };
}

function givenPlayerBoxScore(data) {
  return merge({
    player: givenMinimalPlayer(),
    position: givenPlayerPosition('GK'),
    isGameStarted: true,
    minutesPlayed: 87,
    goals: 0,
    ownGoals: 0,
    assists: 0,
    keyPasses: 0,
    chancesCreated: 0,
    shots: 0,
    shotsOnGoal: 0,
    crosses: 0,
    crossBreakdown: {
      successful: 0,
      percentage: null,
    },
    penaltyKicks: {
      shots: 0,
      goals: 0,
      won: 0,
    },
    foulsCommitted: 0,
    foulsSuffered: 0,
    yellowCards: 0,
    redCards: 0,
    aerialDuels: {
      total: 0,
      won: 0,
      percentage: null,
    },
    groundDuels: {
      total: 0,
      won: 0,
      percentage: null,
    },
    isOnPitch: true,
    offsides: 0,
    cornerKicks: 0,
    clears: 17,
    goalMouthBlocks: 0,
    formation: 1,
    touches: {
      total: 58,
      passes: 13,
      completedPasses: 13,
      passesReceived: 20,
      completionPercentage: '1.000',
      interceptions: 0,
      blocks: 0,
    },
    passLength: {
      short: 0,
      long: 12,
    },
    possessionAdvanced: -76,
    tackles: 0,
    averagePosition: 'HN7',
  }, data);
}

function givenGoaltenderBoxScore(data) {
  return merge({
    player: givenMinimalPlayer(),
    shotsOnGoalFaced: 6,
    position: givenPlayerPosition('GK'),
    isGameStarted: true,
    isWinningGoaltender: null,
    isLosingGoaltender: null,
    isTyingGoaltender: null,
    isOnPitch: true,
    cumulativeRecord: {
      wins: 12,
      losses: 20,
      ties: 18,
    },
    shotsFaced: 10,
    goalsAllowed: 2,
    saves: 4,
    penaltyKicks: {
      shotsFaced: 0,
      goalsAllowed: 0,
      saves: 0,
    },
    isShutout: false,
    catches: 12,
    punches: 0,
    crossesAgainst: {
      total: 27,
      claimed: 7,
    },
  }, data);
}

function givenBenchPlayerBoxScore(data) {
  return merge({
    player: givenMinimalPlayer(),
    yellowCards: 0,
    redCards: 0,
  }, data);
}

function givenMinimalPlayer(data) {
  return Object.assign({
    playerId: 100,
    shirtName: 'Lastname',
    displayName: 'Firstname Lastname',
    uniform: '1',
  }, data);
}

function givenPlayerPosition(abbreviation) {
  switch (abbreviation) {
    case 'GK':
      return {
        positionId: 1,
        name: 'Goalkeeper',
        abbreviation: 'GK',
      };
    case 'F':
      return {
        positionId: 2,
        name: 'Forward',
        abbreviation: 'F',
      };
    case 'M':
      return {
        positionId: 3,
        name: 'Midfielder',
        abbreviation: 'M',
      };
    case 'D':
      return {
        positionId: 4,
        name: 'Defender',
        abbreviation: 'D',
      };
  }
}

module.exports = {
  givenStatsEvent,
  MockStatsEventBuilder,
};
