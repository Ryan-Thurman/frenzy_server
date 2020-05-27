'use strict';

const app = require('../../server');
const {promisify} = require('util');
const robin = require('roundrobin');

const postgresDb = app.dataSources.postgresDb;
console.log(app.dataSource)
const query = promisify(postgresDb.connector.execute).bind(postgresDb.connector);

module.exports = {
  scheduleEvents,
  scheduleSingleFantasyEvent,
  scheduleRoundRobinFantasyEvents,
};

/**
 * Schedule fantasyEvents for the given fantasyLeague
 * @param {FantasyLeague} fantasyLeague
 */
async function scheduleEvents(fantasyLeague) {
  const {FantasyLeague} = app.models;

  switch (fantasyLeague.leagueDuration) {
    case FantasyLeague.LEAGUE_DURATION.WEEKLY:
      return scheduleSingleFantasyEvent(fantasyLeague);
    case FantasyLeague.LEAGUE_DURATION.HALF_SEASON:
    case FantasyLeague.LEAGUE_DURATION.FULL_SEASON:
      return scheduleRoundRobinFantasyEvents(fantasyLeague);
  }
}

/**
 * Creates a single fantasy event in which all teams will participate.
 * @param {FantasyLeague} fantasyLeague League for which to generate a schedule
 */
async function scheduleSingleFantasyEvent(fantasyLeague) {
  // Create a single fantasy event as long as the league
  const fantasyEvent = await app.models.FantasyEvent.create({
    fantasyLeagueId: fantasyLeague.id,
    startDate: fantasyLeague.startDate,
    endDate: fantasyLeague.endDate,
    round: 1,
  });

  // Add all teams in the league to the event
  await query(`
    INSERT INTO fantasyeventteam (fantasyteamid, fantasyeventid)
    SELECT id, $1 FROM fantasyteam
    WHERE fantasyteam.fantasyleagueid = $2
  `, [
    fantasyEvent.id,
    fantasyLeague.id,
  ]);
}

/**
 * Creates fantasy events for a league using a round robin tournament algorithm.
 * @param {FantasyLeague} fantasyLeague League for which to generate a schedule
 */
async function scheduleRoundRobinFantasyEvents(fantasyLeague) {
  // Generate rounds
  const teams = await app.models.FantasyTeam.find({where: {fantasyLeagueId: fantasyLeague.id}});
  const rounds = robin(teams.length, teams);

  // Determine length of each round
  const leagueStartTimestamp = fantasyLeague.startDate.getTime();
  const leagueEndTimestamp = fantasyLeague.endDate.getTime();
  const leagueDuration = leagueEndTimestamp - leagueStartTimestamp;
  const roundDuration = leagueDuration / rounds.length;

  for (let i = 0; i < rounds.length; i++) {
    // Determine start and end of the round
    const roundStartTimestamp = leagueStartTimestamp + (roundDuration * i);
    const roundEndTimestamp = roundStartTimestamp + roundDuration;

    // Create matchups
    const matchups = rounds[i];
    for (const matchupTeams of matchups) {
      const fantasyEvent = await app.models.FantasyEvent.create({
        fantasyLeagueId: fantasyLeague.id,
        startDate: new Date(roundStartTimestamp),
        endDate: new Date(roundEndTimestamp),
        round: i + 1,
      });

      // Assign teams to newly created event
      for (const team of matchupTeams) {
        await app.models.FantasyEventTeam.create({
          fantasyEventId: fantasyEvent.id,
          fantasyTeamId: team.id,
        });
      }
    }
  }
}
