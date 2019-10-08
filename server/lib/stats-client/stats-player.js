'use strict';

const assert = require('assert');
const {request} = require('./request');
const generateCredentials = require('./generate-credentials');
const url = require('url');

/**
 * @description Raw player data fetched from the Stats.com API
 * @prop {number} playerId
 * @prop {string} firstName
 * @prop {string} lastName
 * @prop {string} fullFirst
 * @prop {string} fullLast
 * @prop {number} displayId
 * @prop {string} displayName
 * @prop {number} uniform
 * @prop {Object} team
 * @prop {Object} height
 * @prop {Object} weight
 * @prop {Object} birth
 * @prop {Object} nationality
 * @prop {Array<StatsPlayer~Position>} positions
 * @prop {Object} hometown
 */
class StatsPlayer {
  constructor(data) {
    Object.assign(this, data);

    // Validate instance
    const validMsg = 'StatsLeague instance should be valid';
    assert(this.playerId, validMsg);
    assert(this.displayName, validMsg);
    assert(this.positions, validMsg);
  }

  /**
   * Retrieves all players from the Stats.com API for a given league.
   * Only shows players that belong to the current team roster
   * @return {Promise<Array<StatsPlayer>>}
   */
  static async query(leaguePath) {
    return requestPlayers(leaguePath);
  }

  /**
   * Retrieves a single player from the Stats.com API
   * @param {string} leaguePath The player's league uriPath. @see StatsLeague
   * @param {number} playerId ID of the player to load
   * @return {Promise<StatsPlayer>}
   */
  static async findOne(leaguePath, playerId) {
    const players = await requestPlayers(leaguePath, playerId);
    return players[0];
  }

  /**
   * @return {Object} POJO with properties that can be transferred to a ProPlayer instance
   */
  toProPlayerData() {
    return {
      name: this.displayName,
      statsId: this.playerId,
      position: this.positions[0].abbreviation,
      statsActive: true,
      statsRawData: this,
    };
  }
}

module.exports = StatsPlayer;

async function requestPlayers(leaguePath, playerId = '') {
  leaguePath = leaguePath.toLowerCase();
  const responseData = await request({
    url: `/${leaguePath}/participants/${playerId}`,
    qs: generateCredentials(),
  });
  const players = responseData.apiResults[0].league.players.map(obj => new StatsPlayer(obj));
  return players;
}

/**
 * @typedef StatsPlayer~Position
 * @prop {number} positionId
 * @prop {string} name
 * @prop {string} abbreviation
 * @prop {number} sequence
 */
