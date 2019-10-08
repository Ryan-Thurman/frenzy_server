'use strict';

const app = require('../../server/server');
const {times} = require('lodash');
const {givenProPlayerData, givenProPlayer} = require('./pro-player.helpers');
const {ProTeam, ProPlayer} = app.models;

function givenProTeamData(data) {
  return Object.assign({
    name: 'Test Pro Team',
    fifaGroup: null,
    fifaGroupRank: null,
    statsRawStanding: null,
  }, data);
}

async function givenProTeam(data) {
  return app.models.ProTeam.create(givenProTeamData(data));
}

async function givenProTeams(proTeams) {
  return app.models.ProTeam.create(proTeams);
}

/**
 * Generates 32 ProTeams for a mock FIFA World Cup tournament
 * 8 groups, 4 teams per group
 * @param {object} template Data to assign to each proTeam instance
 */
function given8GroupsOfFourTeams(template = {}) {
  let proTeams = [];
  const proTeamIds = [];

  let proTeamIdWalker = 1;
  for (const groupLetter of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    proTeams = proTeams.concat(times(4, n => {
      proTeamIds.push(proTeamIdWalker);
      return new ProTeam(Object.assign(givenProTeamData({
        id: proTeamIdWalker++,
        name: `Team ${groupLetter}-${n + 1}`,
        fifaGroup: groupLetter,
      }), template));
    }));
  }

  return {
    proTeams,
    proTeamIds,
  };
}

/**
 * Generates a ProTeam and an underlying mock dataset
 * Uses a chainable, fluent interface. Call `build()` method when done.
 * @example
 * ```
 * const body = new MockProTeamBuilder
 *   .withProLeagues([givenProLeague()])
 *   .build();
 * ```
 */
class MockProTeamBuilder {
  constructor() {
    this._proTeamData = givenProTeamData();
    this._proPlayers = [];
  }

  /**
   * Properties to assign to the mock team
   * @param {object} data
   */
  withProTeamData(data) {
    this._proTeamData = data;
    return this;
  }

  /**
   * ProPlayers to associate with the mock team
   * @param {Array<ProPlayer|object>} proPlayers
   */
  withProPlayers(proPlayers) {
    this._proPlayers = proPlayers;
    return this;
  }

  /**
   * Populates the FantasyLeague with a number of generic ProLeagues
   * @param {number} n Number of ProLeagues to generate
   */
  withNProPlayers(n) {
    this._proPlayers = times(n, i => givenProPlayerData({
      name: `Test Pro Player ${i + 1}`,
      statsId: 1000 + i,
      position: ['F', 'M', 'D', 'GK'][i % 4],
    }));

    return this;
  }

  /**
   * Creates the new ProTeam and persists everything to the DB
   */
  async buildAndPersist() {
    const proTeam = await givenProTeam(this._proTeamData);
    const proPlayers = [];

    for (let proPlayer of this._proPlayers) {
      // Normalize proPlayer
      if (!(proPlayer instanceof ProPlayer)) {
        proPlayer = new ProPlayer(givenProPlayerData(proPlayer));
      }

      proPlayer.proTeamId = proTeam.id;
      proPlayer.proLeagueId = proTeam.proLeagueId;
      proPlayer = await proPlayer.save();
      proPlayers.push(proPlayer);
    }

    return {proTeam, proPlayers};
  }
}

module.exports = {
  givenProTeamData,
  givenProTeam,
  givenProTeams,
  given8GroupsOfFourTeams,
  MockProTeamBuilder,
};
