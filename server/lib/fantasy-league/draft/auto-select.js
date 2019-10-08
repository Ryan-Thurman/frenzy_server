/* Automatically selects the next player on a fantasy team's watchlist */
'use strict';

const app = require('../../../server');
const debug = require('debug')('frenzy:draft');
const {promisify} = require('util');

const postgresDb = app.dataSources.postgresDb;
const query = promisify(postgresDb.connector.execute).bind(postgresDb.connector);

module.exports = {
  /**
   * Main autoselector function. Auto-selects for the given fantasy league's current pick turn
   * @param {FantasyLeague} fantasyLeague League for which to auto-select
   * @returns {Promise}
   */
  autoSelectForCurrentPick: async function(fantasyLeague) {
    debug('Autoselecting for league id %d', fantasyLeague.id);

    const pickWasMade = await this.currentPickWasMadeForLeague(fantasyLeague);
    if (pickWasMade) {
      debug('Pick was already made, skipping autoselector');
      return;
    }

    let playerIdToDraft = await this.getTopPlayerIdFromWatchlist(fantasyLeague.currentPickingFantasyTeamId);
    if (!playerIdToDraft) {
      playerIdToDraft = await this.getRandomEligiblePlayerInLeague(fantasyLeague.id);
    }

    if (playerIdToDraft) {
      debug('Adding player %d to team %d', playerIdToDraft, fantasyLeague.currentPickingFantasyTeamId);

      // Add the player to the team
      await app.models.FantasyTeamPlayer.create({
        fantasyTeamId: fantasyLeague.currentPickingFantasyTeamId,
        proPlayerId: playerIdToDraft,
      });

      const customerData = (await query(`
        SELECT c.id, c.username
        FROM customer c
        INNER JOIN fantasyteam ft ON ft.ownerid = c.id
        WHERE ft.fantasyleagueid = $1
        LIMIT 1
      `, [fantasyLeague.id]))[0];

      // Notify the lobby
      app.models.DraftEvent.send(fantasyLeague.id, 'playerDrafted', {
        fantasyLeagueId: fantasyLeague.id,
        pickNumber: fantasyLeague.currentPickNumber,
        fantasyTeamId: fantasyLeague.currentPickingFantasyTeamId,
        teamOwnerId: customerData.id,
        teamOwnerUsername: customerData.username,
        proPlayerId: playerIdToDraft,
        wasAutoSelected: true,
      });
    } else {
      // No player to draft
      debug('No player was drafted');
      // Just notify the lobby for now I guess?
      app.models.DraftEvent.send(fantasyLeague.id, 'noPlayerDrafted', {
        fantasyLeagueId: fantasyLeague.id,
        pickNumber: fantasyLeague.currentPickNumber,
        fantasyTeamId: fantasyLeague.currentPickingFantasyTeamId,
      });
    }
  },

  /**
   * Determines whether a pick has already been made for the
   * active draft turn of a given fantasy league
   * @param {FantasyLeague} fantasyLeague League to check
   * @return {Promise<boolean>} Whether a pick was made
   */
  currentPickWasMadeForLeague: async function(fantasyLeague) {
    return (await query(`
      SELECT EXISTS(
        SELECT 1
        FROM draftevent
        WHERE eventname = 'playerDrafted'
        AND data->>'pickNumber' = $1
        AND fantasyleagueid = $2
      )
    `, [
      fantasyLeague.currentPickNumber,
      fantasyLeague.id,
    ]))[0].exists;
  },

  /**
   * Get the top player from the watchlist for a fantasy team
   * that isn't already assigned to any team in the league
   * @param {number} fantasyTeamId ID of the fantasy team
   * @returns {Promise<number>} `ProPlayer.id` or `null` if no suitable player found
   */
  getTopPlayerIdFromWatchlist: async function(fantasyTeamId) {
    const proPlayerIdResults = await query(`
      SELECT ftw.proplayerid
      FROM fantasyteamwatchlist ftw
      WHERE ftw.fantasyteamid = $1
      AND ftw.proplayerid NOT IN (
        -- Select all player ids assigned to teams in the same league
        SELECT ftp.proplayerid
        FROM fantasyteamplayer ftp
        -- First join to all fantasy teams
        INNER JOIN fantasyteam leagueft ON leagueft.id = ftp.fantasyteamid
        -- Now join to the original fantasy team
        INNER JOIN fantasyteam ft ON ft.fantasyleagueid = leagueft.fantasyleagueid
        WHERE ft.id = $2
      )
      ORDER BY ftw.order ASC
      LIMIT 1
    `, [
      fantasyTeamId,
      fantasyTeamId,
    ]);

    return proPlayerIdResults.length ? proPlayerIdResults[0].proplayerid : null;
  },

  /**
   * Gets a random player from the fantasy league not already belonging to a team
   */
  getRandomEligiblePlayerInLeague: async function(fantasyLeagueId) {
    let randomEligiblePlayerResults = await query(`
      SELECT pp.id
      FROM proplayer pp
      INNER JOIN fantasyleagueallowedproleague flapl
        ON flapl.proleagueid = pp.proleagueid
      WHERE flapl.fantasyleagueid = $1
      AND pp.id NOT IN (
        SELECT ftp.proplayerid
        FROM fantasyteamplayer ftp
        INNER JOIN fantasyteam ft ON ft.id = ftp.fantasyteamid
        WHERE ft.fantasyleagueid = $2
      )
      ORDER BY random()
      LIMIT 1
    `, [
      fantasyLeagueId,
      fantasyLeagueId,
    ]);

    // If no players were found, let's try again without the league whitelist
    if (!randomEligiblePlayerResults.length) {
      randomEligiblePlayerResults = await query(`
        SELECT pp.id
        FROM proplayer pp
        WHERE pp.id NOT IN (
          SELECT ftp.proplayerid
          FROM fantasyteamplayer ftp
          INNER JOIN fantasyteam ft ON ft.id = ftp.fantasyteamid
          WHERE ft.fantasyleagueid = $1
        )
        ORDER BY random()
        LIMIT 1
      `, [fantasyLeagueId]);
    }

    return randomEligiblePlayerResults.length ? randomEligiblePlayerResults[0].id : null;
  },
};
