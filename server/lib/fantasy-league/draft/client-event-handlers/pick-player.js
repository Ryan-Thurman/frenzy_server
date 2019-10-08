'use strict';

const app = require('../../../../server');
const realtimeServer = require('../../../realtime-server');
const {promisify} = require('util');

const postgresDb = app.dataSources.postgresDb;
const query = promisify(postgresDb.connector.execute).bind(postgresDb.connector);

/**
 * Handler for `pickPlayer`
 * @type {draftApiEventHandler}
 */
module.exports = async function pickPlayerHandler(socket, event, sendResponse) {
  const {FantasyTeam, FantasyLeague, FantasyTeamPlayer, DraftEvent} = app.models;

  // Validate the data payload schema
  if (!event.data.proPlayerId)
    throw new realtimeServer.InvalidSchemaError('Event is missing `data.proPlayerId`');
  if (!event.data.fantasyLeagueId)
    throw new realtimeServer.InvalidEventSchemaError('Event is missing `data.fantasyLeagueId`');

  // Determine if it's the requesting customer's turn
  const requestingTeam = await FantasyTeam.findOne({
    fields: {id: true},
    where: {
      ownerId: socket.client.user.id,
      fantasyLeagueId: event.data.fantasyLeagueId,
    },
  });

  // This query does the double duty of making sure it's the requesting team's turn to pick
  const fantasyLeague = await FantasyLeague.findOne({
    where: {
      id: event.data.fantasyLeagueId,
      currentPickingFantasyTeamId: requestingTeam.id,
    },
  });

  if (!fantasyLeague) {
    return sendResponse(realtimeServer.buildResponse(
      event,
      false,
      `Could not draft player ${event.data.proPlayerId}. It is not your turn to pick.`
    ));
  }

  // Determine if the player has already been drafted
  const playerIsAlreadyDrafted = (await query(`
    SELECT EXISTS(
      SELECT 1
      FROM fantasyteamplayer
      INNER JOIN fantasyteam ON fantasyteam.id = fantasyteamplayer.fantasyteamid
      WHERE fantasyteam.fantasyleagueid = $1
      AND fantasyteamplayer.proplayerid = $2
    )
  `.replace(/\s+/g, ' ').trim(),
  [
    event.data.fantasyLeagueId,
    event.data.proPlayerId,
  ]))[0].exists;

  if (playerIsAlreadyDrafted) {
    return sendResponse(realtimeServer.buildResponse(
      event,
      false,
      `Could not draft player ${event.data.proPlayerId}. Player has already been drafted.`
    ));
  }

  // At this point we've confirmed the request is valid

  // Add the player to the team
  await FantasyTeamPlayer.create({
    fantasyTeamId: requestingTeam.id,
    proPlayerId: event.data.proPlayerId,
  });

  // Notify the lobby
  DraftEvent.send(event.data.fantasyLeagueId, 'playerDrafted', {
    fantasyLeagueId: event.data.fantasyLeagueId,
    pickNumber: fantasyLeague.currentPickNumber,
    fantasyTeamId: requestingTeam.id,
    teamOwnerId: socket.client.user.id,
    teamOwnerUsername: socket.client.user.username,
    proPlayerId: event.data.proPlayerId,
    wasAutoSelected: false,
  });

  sendResponse(realtimeServer.buildResponse(event, true));
};
