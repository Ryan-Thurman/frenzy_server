'use strict';

const _ = require('lodash');
const app = require('../../../../server');
const realtimeServer = require('../../../realtime-server');
const {promisify} = require('util');

const postgresDb = app.dataSources.postgresDb;
const query = promisify(postgresDb.connector.execute).bind(postgresDb.connector);

/**
 * Event handler for `joinDraftLobby`
 * @type {draftApiEventHandler}
 */
module.exports = async function joinDraftLobbyHandler(socket, event, sendResponse) {
  const {Draft, DraftEvent, FantasyTeam} = app.models;

  // Validate the data payload schema
  if (!event.data.fantasyLeagueId)
    throw new realtimeServer.InvalidEventSchemaError('Event is missing `data.fantasyLeagueId`');

  // Determine if the customer is a member of the league
  const canJoinLobby = await FantasyTeam.findOne({
    fields: {id: true},
    where: {
      ownerId: socket.client.user.id,
      fantasyLeagueId: event.data.fantasyLeagueId,
    },
  });

  if (!canJoinLobby) {
    return sendResponse(realtimeServer.buildResponse(
      event,
      false,
      `User ${socket.client.user.id} is not a member of league ${event.data.fantasyLeagueId}`
    ));
  }

  // Make sure lastEventId is valid
  if (event.data.lastEventId) {
    const eventIdExists = await DraftEvent.findOne({
      fields: {id: true},
      where: {
        id: event.data.lastEventId,
        fantasyLeagueId: event.data.fantasyLeagueId,
        senderId: null,
      },
    });

    if (!eventIdExists) {
      return sendResponse(realtimeServer.buildResponse(
        event,
        false,
        `${event.data.lastEventId} is not a valid server-side event ID for league ${event.data.fantasyLeagueId}`
      ));
    }
  }

  // At this point we've confirmed the request is valid

  // Send catchup events
  if (event.data.lastEventId !== undefined) {
    let missedEvents;

    if (event.data.lastEventId) { // Send events after a specific ID
      // Fetch events using a window query
      missedEvents = await query(`
        SELECT id, eventName, at, data FROM (
          SELECT *,
            bool_and(id != $1) OVER (ORDER BY at DESC) AS isafterlasteventid
          FROM draftevent
        ) s
        WHERE isafterlasteventid
        AND fantasyleagueid = $2
        AND senderid IS NULL
        ORDER BY at ASC
      `.replace(/\s+/g, ' ').trim(),
      [
        event.data.lastEventId,
        event.data.fantasyLeagueId,
      ]);

      for (const e of missedEvents) {
        e.eventName = e.eventname;
      }
    } else { // Any falsey value for event.data.lastEventId except undefined means "I need everything"
      missedEvents = (await DraftEvent.find({
        fields: ['id', 'eventName', 'at', 'data'],
        where: {
          fantasyLeagueId: event.data.fantasyLeagueId,
          senderId: null,
        },
        order: 'at ASC',
      })).map(e => e.toJSON());
    }

    // Send events to client
    for (const missedEvent of missedEvents) {
      const draftNamespace = realtimeServer.getNamespace(Draft.IO_NAMESPACE);
      draftNamespace.to(socket.id).emit(missedEvent.eventName, _.pick(missedEvent, ['id', 'at', 'data']));
    }
  }

  // Join the league
  socket.join(event.data.fantasyLeagueId);

  // Notify the lobby
  DraftEvent.send(event.data.fantasyLeagueId, 'userJoined', {
    fantasyLeagueId: event.data.fantasyLeagueId,
    userId: socket.client.user.id,
    username: socket.client.user.username,
  });

  sendResponse(realtimeServer.buildResponse(event, true));
};
