'use strict';

const app = require('../../server/server');
const {givenProLeagueData} = require('./pro-league.helpers');
const {givenFantasyTeamData} = require('./fantasy-team.helpers');
const {times} = require('lodash');

const {FantasyLeague, FantasyTeam, FantasyTeamPlayer} = app.models;

function givenFantasyLeagueData(data) {
  return Object.assign({
    name: 'Test League',
    leagueState: FantasyLeague.LEAGUE_STATE.PRE_DRAFT,
    minTeams: 1,
    startDate: '2018-01-02T23:07:27.000Z',
    endDate: '2018-02-15T15:13:14.000Z',
    draftDate: '2018-01-15T10:02:27.000Z',
    currentPickNumber: 1,
    currentPickingFantasyTeamId: null,
    timePerPick: 30000,
    currentPickStartsAt: null,
    currentPickEndsAt: null,
    gamesPlayed: 1,
    lastEventId: null,
    pointsForPlay60: 2,
    pointsForPlay90: 3,
    pointsForDefGoal: 12,
    pointsForMidGoal: 12,
    pointsForFwdGoal: 12,
    pointsForAssist: 8,
    pointsForDribble: 1,
    pointsForOffsides: -1,
    pointsForDefCleanSheet: 4,
    pointsForKeeperCleanSheet: 10,
    pointsForMidCleanSheet: 1,
    pointsForPass70: 3,
    pointsForPass80: 5,
    pointsForPass90: 8,
    pointsForKeyPass: 2,
    pointsForBigChance: 3,
    pointsForSave: 1,
    pointsForTackle: 2,
    pointsForPenSave: 5,
    pointsForPenMiss: -2,
    pointsForKeeperGoalAllowed: -2,
    pointsForDefGoalAllowed: -1,
    pointsForClearance: 0.5,
    pointsForBlocks: 0.5,
    pointsForInterceptions: 0.5,
    pointsForYellowCard: -1,
    pointsForRedCard: -3,
    pointsForOwnGoal: -3,
    pointsForOwnGoalError: -2,
  }, data);
}

async function givenFantasyLeague(data) {
  return FantasyLeague.create(givenFantasyLeagueData(data));
}

/**
 * Generates a FantasyLeague and an underlying mock dataset
 * Uses a chainable, fluent interface. Call `build()` method when done.
 * @example
 * ```
 * const {fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder
 *   .withProLeagues([givenProLeague()])
 *   .buildAndPersists();
 * ```
 */
class MockFantasyLeagueBuilder {
  constructor() {
    this._fantasyLeagueData = null;
    this._teamOwners = [];
    this._proLeagues = [];
    this._proPlayers = [];
    this._fantasyTeams = [];
  }

  /**
   * Properties to assign to the mock league
   * @param {object} data
   */
  withFantasyLeagueData(data) {
    this._fantasyLeagueData = data;
    return this;
  }

  /**
   * Allowed pro leagues for the new fantasy league
   * @param {Array<ProLeague>} proLeagues
   */
  allowingProLeagues(proLeagues) {
    this._proLeagues = proLeagues;
    return this;
  }

  /**
   * FantasyTeams to associate with the new fantasy league
   * @param {Array<FantasyTeam|Object>} fantasyTeams
   */
  withFantasyTeams(fantasyTeams) {
    this._fantasyTeams = fantasyTeams;
    return this;
  }

  /**
   * Populates the FantasyLeague with a number of generic FantasyTeams
   * @param {number} n Number of FantasyTeams to generate
   */
  withNFantasyTeams(n) {
    this._fantasyTeams = times(n, i => givenFantasyTeamData({
      name: `Test Fantasy Team ${i + 1}`,
    }));
    return this;
  }

  /**
   * Customers amongst whom to evenly distribute the fantasy teams
   * @param {Array<Customer>} owners
   */
  andTeamOwners(owners) {
    this._teamOwners = owners;
    return this;
  }

  /**
   * ProPlayers to evenly distribute among the fantasy teams
   * @param {Array<ProPlayer>} proPlayers
   */
  containingProPlayers(proPlayers) {
    this._proPlayers = proPlayers;
    return this;
  }

  /**
   * Creates the new league and persists everything to the DB
   * @return {Promise<{fantasyLeague: FantasyLeague, fantasyTeams: Array<FantasyTeam>}>}
   */
  async buildAndPersist() {
    const fantasyLeague = await givenFantasyLeague(this._fantasyLeagueData);

    // Create and associate FantasyTeams
    const fantasyTeams = [];
    for (let [i, fantasyTeam] of this._fantasyTeams.entries()) {
      // Normalize proPlayer
      if (!(fantasyTeam instanceof FantasyTeam)) {
        fantasyTeam = new FantasyTeam(givenFantasyTeamData(fantasyTeam));
      }

      fantasyTeam.fantasyLeagueId = fantasyLeague.id;
      if (this._teamOwners.length) {
        fantasyTeam.ownerId = this._teamOwners[i % this._teamOwners.length].id;
      }
      fantasyTeam.pickOrder = i;
      fantasyTeam = await fantasyTeam.save();
      fantasyTeams.push(fantasyTeam);
    }

    // Associate ProLeagues
    for (let proLeague of this._proLeagues) {
      await fantasyLeague.allowedProLeagues.add(proLeague);
    }

    // Associate ProPlayers
    for (let [i, proPlayer] of this._proPlayers.entries()) {
      await FantasyTeamPlayer.create({
        fantasyTeamId: fantasyTeams[i % fantasyTeams.length].id,
        proPlayerId: proPlayer.id,
        position: ['F', 'M', 'D', 'GK'][i % 4],
      });
    }

    return {fantasyLeague, fantasyTeams};
  }
}

module.exports = {
  givenFantasyLeagueData,
  givenFantasyLeague,
  MockFantasyLeagueBuilder,
};
