'use strict';

const {StatsEvent} = require('./stats-client');
const moment = require('moment');

/**
 * @const
 * @description By default, fetch events this far into the future.
 */
const DEFAULT_EVENT_SEARCH_RANGE = moment.duration(1, 'month');

module.exports = {
  updateEventSchedule,
  DEFAULT_EVENT_SEARCH_RANGE,
};

/**
 * Refresh the contents of ProEvent table
 * using data from the Stats.com API server
 * @param {object} options
 * @param {Loopback.LoopbackApplication} options.app
 * @param {ProLeague|Array<ProLeague>} [options.proLeagues] Load events for these ProLeagues
 * @param {ProLeague|Array<ProLeague>} [options.proLeague] Alias for options.proLeagues. Must provide one.
 * @param {any} [options.startDate=today] @see updateEventsForLeague
 * @param {any} [options.endDate=startDate+DEFAULT_EVENT_SEARCH_RANGE] @see updateEventsForLeague
 * @return {Array<ProEvent>} ProEvents that were updated
 */
async function updateEventSchedule({app, proLeagues = [], proLeague, startDate, endDate}) {
  // Normalize input
  if (proLeagues && !Array.isArray(proLeagues)) {
    proLeagues = [proLeagues];
  }
  if (proLeague) {
    if (Array.isArray(proLeague)) {
      proLeagues = proLeagues.concat(proLeague);
    } else {
      proLeagues.push(proLeague);
    }
  }

  // Update events for all leagues
  let updatedProEvents = [];
  await app.dataSources.postgresDb.transaction(async models => {
    for (const proLeague of proLeagues) {
      const updatedProEventsForLeague = await updateEventsForLeague({app, proLeague, startDate, endDate});
      updatedProEvents = updatedProEvents.concat(updatedProEventsForLeague);
    }
  });

  return updatedProEvents;
}

/**
 * Refresh the contents of ProEvent table for a single league
 * @param {object} options
 * @param {Loopback.LoopbackApplication} options.app
 * @param {ProLeague} options.proLeague Load events for this single ProLeague
 * @param {any} [options.startDate=today] Only update events on/after this date (utc).
 *   Accepts any single value that may be passed to the momentjs constructor.
 * @param {any} [options.endDate=startDate+DEFAULT_EVENT_SEARCH_RANGE] Only update events
 *   on/before this date (utc). Accepts any single value that may be passed to the momentjs constructor.
 * @return {Array<ProEvent>} ProEvents that were updated
 */
async function updateEventsForLeague({app, proLeague, startDate, endDate}) {
  // Normalize input
  if (!startDate) startDate = moment();
  if (!endDate) endDate = moment(startDate).add(DEFAULT_EVENT_SEARCH_RANGE);

  if (!moment.isMoment(startDate)) startDate = moment(startDate);
  if (!moment.isMoment(endDate)) endDate = moment(endDate);

  // Fetch remote data
  const statsEvents = await StatsEvent.query(proLeague.statsPath, {
    startDate: startDate.format('YYYYMMDD'),
    endDate: endDate.format('YYYYMMDD'),
  });

  let proEvents;

  await app.dataSources.postgresDb.transaction(async models => {
    const {ProEvent, ProTeam} = models;

    // Compare to local database
    const statsIds = statsEvents.map(statsEvent => statsEvent.eventId);
    const matchingProEvents = await ProEvent.find({
      where: {statsId: {inq: statsIds}},
    });

    // Flag any local records missing from remote dataset
    await ProEvent.updateAll({
      proLeagueId: proLeague.id,
      startDate: {between: [startDate, endDate]},
      statsId: {nin: statsIds},
    }, {statsActive: false});

    proEvents = await Promise.all(statsEvents.map(async statsEvent => {
    // Does it already exist in the database?
      let matchingProEvent = matchingProEvents.find(proEvent => proEvent.statsId === statsEvent.eventId);
      if (matchingProEvent) {
      // Update existing record
        const updatedData = statsEvent.toProEventData();
        matchingProEvent = await matchingProEvent.updateAttributes(updatedData);
      } else {
      // Create new record
        matchingProEvent = await ProEvent.create(statsEvent.toProEventData());
      }

      // Associate with the league
      matchingProEvent.proLeague(proLeague);

      // Associate the winner
      const winnerTeam = statsEvent.teams.find(team => team.isWinner);
      if (winnerTeam) {
        const winnerProTeam = await ProTeam.find({
          where: {statsId: winnerTeam.teamId},
        });
        matchingProEvent.winner(winnerProTeam);
      }

      return matchingProEvent.save();
    }));
  });

  return proEvents;
}
