'use strict';

const assert = require('assert');
const {request} = require('./request');
const generateCredentials = require('./generate-credentials');
const url = require('url');

/**
 * @description Raw team data fetched from the Stats.com API
 * @prop {number} teamId
 * @prop {string} location
 * @prop {string} abbreviation
 * @prop {string} displayName
 * @prop {number} teamTypeId
 * @prop {Object} venue
 * @prop {Object} country
 */
class StatsTeam {
  constructor(data) {
    Object.assign(this, data);

    // Validate instance
    const validMsg = 'StatsTeam instance should be valid';
    assert(this.teamId, validMsg);
    assert(this.displayName, validMsg);
  }

  /**
   * Retrieves all teams from the Stats.com API for a given league.
   * Only shows teams that participated in the current season.
   * @param {string} leaguePath The team's league uriPath. @see StatsLeague
   * @return {Promise<Array<StatsTeam>>}
   */
  static async query(leaguePath) {
    return requestTeams(leaguePath);
  }

  /**
   * Retrieves teams with standings data from the Stats.com API for a given league.
   * @param {string} leaguePath The team's league uriPath. @see StatsLeague
   * @return {Promise<Array<StatsTeam>>}
   */
  static async queryStandings(leaguePath) {
    leaguePath = leaguePath.toLowerCase();

    const responseData = await request({
      url: `/${leaguePath}/standings/`,
      qs: generateCredentials(),
    });

    const teams = responseData.apiResults[0].league.season.eventType
      .reduce(reduceEventTypesToConferences, [])
      .reduce(reduceConferencesToTeams, [])
      .map(obj => new StatsTeam(obj));

    return teams;
  }

  /**
   * Retrieves a single team from the Stats.com API
   * @param {string} leaguePath The team's league uriPath. @see StatsLeague
   * @param {number} teamId ID of the team to load
   * @return {Promise<StatsTeam>}
   */
  static async findOne(leaguePath, teamId) {
    const teams = await requestTeams(leaguePath, teamId);
    return teams[0];
  }

  /**
   * @return {Object} POJO with properties that can be transferred to a ProTeam instance
   */
  toProTeamData() {
    const output = {
      name: this.displayName,
      statsId: this.teamId,
      statsActive: true,
      statsRawData: this,
    };

    if (this._division) {
      // Parse fifa group
      const divisionIsFifaGroup = this._division.name && this._division.name.indexOf('Group ') === 0;
      if (divisionIsFifaGroup) {
        output.fifaGroup = this._division.name.charAt(6).toLowerCase();
      }
    }

    // Parse fifa rank
    if (output.fifaGroup) {
      if (this.division && this.division.rank) {
        output.fifaGroupRank = this.division.rank;
      }
    }

    return output;
  }
}

module.exports = StatsTeam;

async function requestTeams(leaguePath, teamId = '') {
  leaguePath = leaguePath.toLowerCase();

  const params = generateCredentials();
  params.allTeams = true;

  const responseData = await request({
    url: `/${leaguePath}/teams/${teamId}`,
    qs: params,
  });
  const teams = responseData.apiResults[0].league.season.conferences
    .reduce(reduceConferencesToTeams, [])
    .map(obj => new StatsTeam(obj));

  return teams;
}

function reduceEventTypesToConferences(conferences, eventType) {
  return conferences.concat(eventType.conferences);
}

function reduceConferencesToTeams(teams, conference) {
  return conference.divisions.reduce(reduceDivisionsToTeams, teams);
}

function reduceDivisionsToTeams(teams, division) {
  // Denormalize division data
  if (division.divisionId) {
    division.teams.forEach(team => {
      team._division = {
        divisionId: division.divisionId,
        name: division.name,
        abbreviation: division.abbreviation,
      };
    });
  }

  return teams.concat(division.teams);
}
