'use strict';

const app = require('../../server');
const {promisify} = require('util');
const {scorePlayerInFantasyEvent} = require('./score-calculator');
const _ = require('lodash');

const postgresDb = app.dataSources.postgresDb;
const query = promisify(postgresDb.connector.execute).bind(postgresDb.connector);

module.exports = {
  handleChangedProEventPlayerStats,
  refreshFantasyTeamPlayerProEventMeta,
  refreshFantasyEventTeamPointsForPlayer,
  refreshFantasyEventPlayerStats,
};

/**
 * Handler for incoming ProPlayer single-ProEvent stats updates
 *   1. Records player position for this event for each fantasy team
 *   2. Refreshes all dependent FantasyEventPlayerStats (which also kicks off a scoring update)
 * @param {ProEventPlayerStats} proEventPlayerStats
 * @returns {Promise}
 */
async function handleChangedProEventPlayerStats(proEventPlayerStats) {
  await refreshFantasyTeamPlayerProEventMeta(proEventPlayerStats.proEventId, proEventPlayerStats.proPlayerId);
  await refreshFantasyEventPlayerStats(proEventPlayerStats);
}

/**
 * Handle incoming updated proEventPlayerStats for FantasyTeamPlayerProEventMeta.
 * Records player's position and position order for all their fantasy teams if not yet set.
 * @param {ProEventPlayerStats} proEventPlayerStats
 * @returns {Promise}
 */
async function refreshFantasyTeamPlayerProEventMeta(proEventId, proPlayerId) {
  // Find all fantasy teams:
  //    including this player
  //    WITHOUT a FantasyTeamPlayerProEventMeta record for this player/team/event combo
  // Create a new record from the contents of the FantasyTeamPlayer table
  await query(`
    INSERT INTO fantasyteamplayerproeventmeta
      (fantasyteamid, proplayerid, proeventid, position, positionorder, createdat, updatedat)
    SELECT ftp.fantasyteamid, ftp.proplayerid, $1, ftp.position, ftp.positionorder, now(), now()
      FROM fantasyteamplayer ftp
      LEFT JOIN fantasyteamplayerproeventmeta ftppem
        ON ftp.fantasyteamid = ftppem.fantasyteamid
        AND ftp.proplayerid = ftppem.proplayerid
        AND ftppem.proeventid = $2
      WHERE ftppem.proeventid IS NULL
        AND ftp.proplayerid = $3
  `, [
    proEventId,
    proEventId,
    proPlayerId,
  ]);
}

/**
 * Given a pro player and a fantasy event in which they are participating,
 * retotal the points for that player's fantasy team
 * @param {number} proPlayerId
 * @param {number} fantasyEventId
 */
async function refreshFantasyEventTeamPointsForPlayer(proPlayerId, fantasyEventId) {
  // A lot of compound primary keys make this query relatively complex with the joins.
  // Here is the logical progression:
  //   1. In the subquery, start with the fantasyEventPlayerStats for the given player/event
  //   2. Find the team for that player using the FantasyEventTeam and FantasyTeamPlayer tables (both at once)
  //   3. Find all the players on that team
  //   4. Load their stats for the given event (again using the two tables from step 2)
  //   5. Total the points
  //   6. Use that total to update the points column in the FantasyEventTeam table
  await query(`
    UPDATE fantasyeventteam
    SET points = sq.total
    FROM (
      SELECT fet.fantasyteamid, SUM(feps.points) as total
      FROM fantasyeventplayerstats singlePlayerFEPS
      JOIN fantasyeventteam singlePlayerFET
        ON singlePlayerFET.fantasyeventid = singlePlayerFEPS.fantasyeventid
      JOIN fantasyteamplayer singlePlayerFTP
        ON singlePlayerFTP.proplayerid = singlePlayerFEPS.proplayerid
        AND singlePlayerFTP.fantasyteamid = singlePlayerFET.fantasyteamid
      JOIN fantasyteamPlayer ftp
        ON ftp.fantasyteamid = singlePlayerFTP.fantasyteamid
      JOIN fantasyeventteam fet
        ON fet.fantasyteamid = ftp.fantasyteamid
      JOIN fantasyeventplayerstats feps
        ON feps.fantasyeventid = fet.fantasyeventid
        AND feps.proplayerid = ftp.proplayerid
      WHERE singlePlayerFEPS.proplayerid = $1
        AND fet.fantasyeventid = $2
      GROUP BY fet.fantasyteamid
    ) AS sq
    WHERE fantasyeventteam.fantasyteamid = sq.fantasyteamid
      AND fantasyeventteam.fantasyeventid = $3
  `, [
    proPlayerId,
    fantasyEventId,
    fantasyEventId,
  ]);

  const fantasyEvent = await app.models.FantasyEvent.findOne({
    fantasyEventId: fantasyEventId,
  });
  await fantasyEvent.updateWinner();
}

/**
 * Handle incoming updated proEventPlayerStats for FantasyEventPlayerStats.
 * Refreshes aggregate stats for all fantasy events in which the player is participating.
 * @param {ProEventPlayerStats} proEventPlayerStats
 * @returns {Promise}
 */
async function refreshFantasyEventPlayerStats(proEventPlayerStats) {
  const proEvent = await app.models.ProEvent.findById(proEventPlayerStats.proEventId);

  // Find all fantasy events where:
  //    The player belongs to a fantasy team participating
  //    The player is not benched
  //    The pro event start time is within the fantasy event start/end time range
  const overlappingFantasyEvents = await query(`
    SELECT fe.id, fe.fantasyleagueid, fe.startdate, fe.enddate
      FROM fantasyevent fe
    JOIN fantasyeventteam fet
      ON fe.id = fet.fantasyeventid
    JOIN fantasyteamplayer ftp
      ON fet.fantasyteamid = ftp.fantasyteamid
    JOIN fantasyteamplayerproeventmeta ftppem
      ON ftp.fantasyteamid = ftppem.fantasyteamid
      AND ftp.proplayerid = ftppem.proplayerid
      AND ftppem.proeventid = $1
    WHERE ftp.proplayerid = $2
      AND ftppem.position IS NOT NULL
      AND $3 BETWEEN fe.startdate AND fe.enddate
  `, [
    proEvent.id,
    proEventPlayerStats.proPlayerId,
    proEvent.startDate,
  ]);

  for (const fantasyEventQueryResult of overlappingFantasyEvents) {
    // Find all pro event stats where
    //    The player participated in the event
    //    The player was not benched
    //    The start time is within the fantasy event start and end time
    const proEventStats = await query(`
      SELECT peps.*
      FROM proeventplayerstats peps
      JOIN proevent pe
        ON pe.id = peps.proeventid
      JOIN fantasyteamplayerproeventmeta ftppem
        ON peps.proeventid = ftppem.proeventid
        AND peps.proplayerid = ftppem.proplayerid
      JOIN fantasyeventteam fet
        ON fet.fantasyteamid = ftppem.fantasyteamid
      WHERE fet.fantasyeventid = $1
        AND ftppem.position IS NOT NULL
        AND pe.startdate BETWEEN $2 AND $3
    `, [
      fantasyEventQueryResult.id,
      fantasyEventQueryResult.startdate,
      fantasyEventQueryResult.enddate,
    ]);
    // Note that the raw data from the DB uses lower case field names

    // Calculate updated values
    // @todo Maybe optimize to use one loop instead of many
    const newFantasyEventPlayerStats = new app.models.FantasyEventPlayerStats({
      fantasyEventId: fantasyEventQueryResult.id,
      proPlayerId: proEventPlayerStats.proPlayerId,
      minutesPlayed: _.sumBy(proEventStats, 'minutesplayed'),
      proEventsPlayed: proEventStats.length,
      goals: _.sumBy(proEventStats, 'goals'),
      ownGoals: _.sumBy(proEventStats, 'owngoals'),
      goalsAllowed: _.sumBy(proEventStats, 'goalsallowed'),
      penaltyShots: _.sumBy(proEventStats, 'penaltyshots'),
      penaltyGoals: _.sumBy(proEventStats, 'penaltygoals'),
      clears: _.sumBy(proEventStats, 'clears'),
      foulsCommitted: _.sumBy(proEventStats, 'foulscommitted'),
      assists: _.sumBy(proEventStats, 'assists'),
      tackles: _.sumBy(proEventStats, 'tackles'),
      saves: _.sumBy(proEventStats, 'saves'),
      keyPasses: _.sumBy(proEventStats, 'keypasses'),
      passesCompleted: _.sumBy(proEventStats, 'passescompleted'),
      passesAttempted: _.sumBy(proEventStats, 'passesattempted'),
      redCards: _.sumBy(proEventStats, 'redcards'),
      yellowCards: _.sumBy(proEventStats, 'yellowcards'),
      offsides: _.sumBy(proEventStats, 'offsides'),
      interceptions: _.sumBy(proEventStats, 'interceptions'),
      blocks: _.sumBy(proEventStats, 'blocks'),
      cleanSheets: proEventStats.filter(pes => pes.goalsAllowed === 0).length,
    });
    newFantasyEventPlayerStats.minutesPerProEvent =
      newFantasyEventPlayerStats.minutesPlayed /
      newFantasyEventPlayerStats.proEventsPlayed;
    newFantasyEventPlayerStats.passCompletionPercentage =
      newFantasyEventPlayerStats.passesCompleted /
      newFantasyEventPlayerStats.passesAttempted *
      100;
    const fantasyLeague = await app.models.FantasyLeague.findById(fantasyEventQueryResult.fantasyleagueid);
    newFantasyEventPlayerStats.points = scorePlayerInFantasyEvent(newFantasyEventPlayerStats, fantasyLeague);
    await app.models.FantasyEventPlayerStats.upsertWithWhere({
      fantasyEventId: newFantasyEventPlayerStats.fantasyEventId,
      proPlayerId: newFantasyEventPlayerStats.proPlayerId,
    }, newFantasyEventPlayerStats);

    // @todo Perhaps optimize so that we only retotal points for a team once per data ingest from stats
    await refreshFantasyEventTeamPointsForPlayer(proEventPlayerStats.proPlayerId, fantasyEventQueryResult.id);
  }
}
