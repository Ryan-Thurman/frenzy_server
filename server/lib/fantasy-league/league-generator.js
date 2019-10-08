'use strict';

const app = require('../../server');
const moment = require('moment-timezone');
const {promisify} = require('util');

const {FantasyLeague} = app.models;

const postgresDb = app.dataSources.postgresDb;
const query = promisify(postgresDb.connector.execute).bind(postgresDb.connector);

/** @enum {number} */
const DAY_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

/** @type {string} The timezone to use for determining what day it is */
const TIMEZONE = 'America/Los_Angeles';
/** @type {moment.duration} How long before midnight to start the league for a given day */
const START_OFFSET = moment.duration(-1, 'hour');
/** @type {moment.duration} How long before the league start time to set the draft time, initially */
const DRAFT_OFFSET = moment.duration(-2, 'hours');

module.exports = {
  generateAllWeeklyLeagues,
  generateWeeklyLeague,
  DAY_OF_WEEK,
};

/**
 * Generates all missing weeklong leagues
 * @param {Array.<ProLeague>} [allowedProLeagues] ProLeagues to whitelist for the new FantasyLeague
 * @param {Date} [now] Treat this as "now". For test mocking.
 */
async function generateAllWeeklyLeagues(allowedProLeagues = [], now = new Date()) {
  for (const day of Object.values(DAY_OF_WEEK)) {
    await generateWeeklyLeague(day, allowedProLeagues);
  }
}

/**
 * Generates a weeklong league if one is not already available
 * @param {DAY_OF_WEEK} dayOfWeek The day the weekly league should associate with.
 *   The league will start at 11pm the night before.
 * @param {Array.<ProLeague>} [allowedProLeagues] ProLeagues to whitelist for the new FantasyLeague
 * @param {Date} [now] Treat this as "now". For test mocking.
 */
async function generateWeeklyLeague(dayOfWeek, allowedProLeagues = [], now = new Date()) {
  // 11pm PT the night before the next occurence of dayOfWeek after the draft time
  const startDate = getNext(dayOfWeek, moment(now).subtract(START_OFFSET + DRAFT_OFFSET)).add(START_OFFSET);
  // 9pm PT
  const draftDate = startDate.clone().add(DRAFT_OFFSET);

  const leagueExists = await isWeeklyLeagueAvailable(dayOfWeek, draftDate.toDate());
  if (leagueExists) return;

  const newLeague = await FantasyLeague.create({
    name: 'Weekly League', // @todo Dynamic name
    leagueState: FantasyLeague.LEAGUE_STATE.PRE_DRAFT,
    minTeams: 8,
    maxTeams: 16,
    startDate: startDate.toDate(),
    endDate: startDate.clone().add(1, 'week').toDate(),
    draftDate: draftDate.toDate(),
    dayOfWeek: dayOfWeek,
    leagueDuration: FantasyLeague.LEAGUE_DURATION.WEEKLY,
  });

  // Associate allowed pro leagues
  await app.models.FantasyLeagueAllowedProLeague.create(allowedProLeagues.map(proLeague => {
    return {
      proLeagueId: proLeague.id,
      fantasyLeagueId: newLeague.id,
    };
  }));

  return newLeague;
}

/**
 * Determines if a weekly league exists that:
 * - Matches the given day of the week
 * - Starts before the cutoff date
 * - Still has room for more teams to join
 * @param {DAY_OF_WEEK} dayOfWeek The day the weekly league should start on
 */
async function isWeeklyLeagueAvailable(dayOfWeek, cutoffDate) {
  const queryResults = await query(`
    SELECT EXISTS (
      SELECT fl.id, COUNT(DISTINCT ft.id)
      FROM fantasyleague fl
      LEFT JOIN fantasyteam ft ON fl.id = ft.fantasyleagueid
      WHERE fl.dayofweek = $1
        AND fl.startdate >= $2
      GROUP BY fl.id
      HAVING COUNT(DISTINCT ft.id) < fl.maxteams
    )
  `, [
    dayOfWeek,
    cutoffDate,
  ]);

  return queryResults[0].exists;
}

/**
 * Gets the next occurence of the given day of the week
 * @param {DAY_OF_WEEK} dayOfWeek
 * @param {Date} [now] Treat this as "now". For test mocking.
 * @return {moment}
 */
function getNext(dayOfWeek, now = new Date()) {
  const today = moment(now).tz(TIMEZONE).day();

  if (today < dayOfWeek) {
    return moment(now).tz(TIMEZONE).day(dayOfWeek).startOf('day');
  } else {
    return moment(now).tz(TIMEZONE).add(1, 'week').day(dayOfWeek).startOf('day');
  }
}
