'use strict';

const {
  StatsLeague,
  StatsTeam,
  StatsPlayer,
  StatsEvent,
} = require('../../../server/lib/stats-client');
const {BASE_URL} = require('../../../server/lib/stats-client');
const {givenStatsLeague} = require('./stats-league');
const {givenStatsTeam} = require('./stats-team');
const {givenStatsPlayer} = require('./stats-player');
const {
  givenStatsEvent,
  MockStatsEventBuilder,
} = require('./stats-event');
const {givenStatsDate} = require('./stats-other');
const nock = require('nock');
const {get, cloneDeep} = require('lodash');

/**
 * Generates a fake response body for the Stats.com API.
 * Uses a chainable, fluent interface. Call `build()` method when done.
 * @example
 * ```
 * const body = new StatsMockResponseBuilder
 *   .withLeagues([givenStatsLeague()])
 *   .build();
 * ```
 */
class StatsMockResponseBuilder {
  constructor() {
    this._leagues = [];
    this._teams = [];
    this._players = [];
    this._events = [];
  }

  /**
   * @param {Array<StatsLeague} leagues
   */
  withLeagues(leagues) {
    this._leagues = cloneDeep(leagues);
    return this;
  }

  withTeams(teams) {
    this._teams = cloneDeep(teams);
    return this;
  }

  withPlayers(players) {
    this._players = cloneDeep(players);
    return this;
  }

  withEvents(events) {
    this._events = cloneDeep(events);
    return this;
  }

  /**
   * Generates the mocked response
   * @returns {Object}
   */
  build() {
    const timestamp = (new Date).toISOString();
    const recordCount = this._leagues.length +
      this._teams.length +
      this._players.length +
      this._events.length;

    const response = {
      status: 'OK',
      recordCount: recordCount,
      startTimestamp: timestamp,
      endTimestamp: timestamp,
      timeTaken: 0,
      apiResults: [{
        sportId: 8,
        name: 'Soccer',
        uriPaths: [{
          pathSequence: 1,
          path: 'soccer',
        }],
      }],
    };

    if (this._leagues.length) response.apiResults[0].leagues = this._leagues.map(league => ({league}));

    const needsLeagueWrapper = Boolean(this._teams.length || this._players.length || this._events.length);
    if (needsLeagueWrapper) response.apiResults[0].league = givenStatsLeague();

    const needsSeasonWrapper = Boolean(this._teams.length || this._events.length);
    if (needsSeasonWrapper) {
      response.apiResults[0].league.season = {
        season: 2018,
        name: '2018 Test Season',
        isActive: true,
      };
    }

    if (this._teams.length) {
      // Renormalize divisions and remove from team objects if supplied
      const divisions = this._teams.reduce((divisions, team) => {
        // Skip teams without divisions
        const teamHasDivision = team._division;
        if (!teamHasDivision) return divisions;

        // Separate division from team object
        const teamDivision = team._division;
        delete team._division;

        const existingDivision = divisions.find(d => d.divisionId === teamDivision.divisionId);
        if (existingDivision) {
          existingDivision.teams.push(team);
        } else {
          teamDivision.teams = [team];
          divisions.push(teamDivision);
        }

        return divisions;
      }, []);

      // Default division
      if (!divisions.length) {
        divisions.push({
          divisionId: null,
          teams: this._teams,
        });
      }

      response.apiResults[0].league.season.conferences = [{
        conferenceId: null,
        divisions: divisions,
      }];
    }

    if (this._players.length) {
      response.apiResults[0].league.players = this._players;
    }

    if (this._events.length) {
      response.apiResults[0].league.season.eventType = [{
        eventTypeId: 1,
        name: 'Regular Season',
        events: this._events,
      }];
    }

    return response;
  }
}

/**
 * Uses Nock to create a mocked Stats API leagues endpoint
 * @param {Array<StatsLeague>} leagues Leagues to respond with
 * @returns {Object} Nock server instance
 */
function givenMockedStatsLeagueEndpointWithLeagues(leagues) {
  return nock(BASE_URL)
    .get('/leagues/')
    .query(true)
    .reply(200, new StatsMockResponseBuilder().withLeagues(leagues).build());
}

/**
 * Uses Nock to create a mocked Stats API teams endpoint
 * @param {string} leagueStatsPath The league path identifier the teams should load under
 * @param {Array<StatsTeam>} teams Teams to respond with
 * @returns {Object} Nock server instance
 */
function givenMockedStatsTeamEndpointWithTeams(leagueStatsPath, teams) {
  return nock(BASE_URL)
    .get(`/${leagueStatsPath}/teams/`)
    .query(true)
    .reply(200, new StatsMockResponseBuilder().withTeams(teams).build());
}

/**
 * Uses Nock to create a mocked Stats API teams endpoint that returns a failed response
 * @param {string} leagueStatsPath The league path identifier the teams should load under
 * @returns {Object} Nock server instance
 */
function givenMockedStatsTeamEndpointFailure(leagueStatsPath) {
  return nock(BASE_URL)
    .get(`/${leagueStatsPath}/teams/`)
    .query(true)
    .reply(500, {});
}

/**
 * Uses Nock to create a mocked Stats API players endpoint
 * @param {string} leagueStatsPath The league path identifier the players should load under
 * @param {Array<StatsPlayer>} players Players to respond with
 * @returns {Object} Nock server instance
 */
function givenMockedStatsPlayerEndpointWithPlayers(leagueStatsPath, players) {
  return nock(BASE_URL)
    .get(`/${leagueStatsPath}/participants/`)
    .query(true)
    .reply(200, new StatsMockResponseBuilder().withPlayers(players).build());
}

/**
 * Uses Nock to create a mocked Stats API events endpoint
 * @param {string} leagueStatsPath The league path identifier the events should load under
 * @param {Array<StatsEvent>} events Events to respond with
 * @returns {Object} Nock server instance
 */
function givenMockedStatsEventEndpointWithBoxEvent(leagueStatsPath, event) {
  return nock(BASE_URL)
    .get(`/${leagueStatsPath}/events/${event.eventId}`)
    .query(true)
    .reply(200, new StatsMockResponseBuilder().withEvents([event]).build());
}

/**
 * Uses Nock to create a mocked Stats API events endpoint
 * @param {string} leagueStatsPath The league path identifier the events should load under
 * @param {Array<StatsEvent>} events Events to respond with
 * @returns {Object} Nock server instance
 */
function givenMockedStatsEventEndpointWithEvents(leagueStatsPath, events) {
  return nock(BASE_URL)
    .get(`/${leagueStatsPath}/events/`)
    .query(true)
    .reply(200, new StatsMockResponseBuilder().withEvents(events).build());
}

/** Locally cached copy of process.env */
const env = Object.assign({}, process.env);

/** Configure a value for the stats API key env vars to prevent assertion errors */
function givenMockedStatsApiKey() {
  process.env.STATS_API_KEY = 'mocked stats api key';
  process.env.STATS_API_SECRET = 'mocked stats api key';
}

/** Restore stats API key env vars to their original state */
function cleanupMockedStatsApiKey() {
  process.env.STATS_API_KEY = env.STATS_API_KEY;
  process.env.STATS_API_SECRET = env.STATS_API_SECRET;
}

module.exports = {
  givenStatsLeague,
  givenStatsTeam,
  givenStatsPlayer,
  givenStatsEvent,
  MockStatsEventBuilder,
  givenStatsDate,
  StatsMockResponseBuilder,
  givenMockedStatsLeagueEndpointWithLeagues,
  givenMockedStatsTeamEndpointWithTeams,
  givenMockedStatsTeamEndpointFailure,
  givenMockedStatsPlayerEndpointWithPlayers,
  givenMockedStatsEventEndpointWithEvents,
  givenMockedStatsEventEndpointWithBoxEvent,
  givenMockedStatsApiKey,
  cleanupMockedStatsApiKey,
};
