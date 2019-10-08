'use strict';

const assert = require('assert');
const {request} = require('./request');
const generateCredentials = require('./generate-credentials');

/**
 * @description Raw league data fetched from the Stats.com API
 * @prop {number} leagueId
 * @prop {string} name
 * @prop {string} abbreviation
 * @prop {string} displayName
 * @prop {Array<{pathSequence: number, path: string}>} uriPaths
 */
module.exports = class StatsLeague {
  constructor(data) {
    Object.assign(this, data);

    // Validate instance
    const validMsg = 'StatsLeague instance should be valid';
    assert(this.leagueId, validMsg);
    assert(this.name, validMsg);
    assert(this.abbreviation, validMsg);
    assert(this.displayName, validMsg);
    assert(this.path, validMsg);
  }

  /**
   * Retrieves all leagues from the Stats.com API
   * @return {Promise<Array<StatsLeague>>}
   */
  static async query() {
    const responseData = await request({
      url: '/leagues/',
      qs: generateCredentials(),
    });
    const leagues = responseData.apiResults[0].leagues.map(obj => new StatsLeague(obj.league));
    return leagues;
  }

  /**
   * @return {string} The primary URI path, which is used as an identifier by the Stats API
   */
  get path() {
    return this.uriPaths[0].path;
  }

  /**
   * @return {Object} POJO with properties that can be transferred to a ProLeague instance
   */
  toProLeagueData() {
    return {
      name: this.displayName,
      statsId: this.leagueId,
      statsPath: this.path,
      statsActive: true,
      statsRawData: this,
    };
  }
};
