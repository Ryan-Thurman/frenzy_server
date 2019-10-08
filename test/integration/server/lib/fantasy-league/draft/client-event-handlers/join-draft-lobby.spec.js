'use strict';

const app = require('../../../../../../../server/server');
const expect = require('../../../../../../helpers/expect-preconfigured');
const {givenLoggedInCustomer} = require('../../../../../../helpers/customer.helpers');
const {givenEmptyDatabase} = require('../../../../../../helpers/database.helpers');
const {
  givenSocket,
  givenAuthenticatedCustomerSocket,
  givenRunningServer,
  closeRunningServer,
} = require('../../../../../../helpers/realtime-server.helpers');
const {givenProLeague} = require('../../../../../../helpers/pro-league.helpers');
const {MockProTeamBuilder} = require('../../../../../../helpers/pro-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../../../helpers/fantasy-league.helpers');
const {givenDraftEvent} = require('../../../../../../helpers/draft-event.helpers');
const {promisify} = require('util');
const realtimeServer = require('../../../../../../../server/lib/realtime-server');
const sleep = promisify(setTimeout);
const {sortBy, pick} = require('lodash');

describe('integration: DraftClientEventHandlers (joinDraftLobby)', () => {
  beforeEach(givenEmptyDatabase);

  let httpServerAddress, httpServer, draftNamespaceUrl;
  beforeEach('given running realtime server', async () => {
    ({httpServerAddress, httpServer} = await givenRunningServer(app));
    draftNamespaceUrl = httpServerAddress + app.models.Draft.IO_NAMESPACE;
  });

  let customerSocket, customer;
  beforeEach('given authenticated customer socket', async () => {
    ({customer, socket: customerSocket} = await givenAuthenticatedCustomerSocket(draftNamespaceUrl));
  });

  let proLeague, proPlayers, fantasyLeague, fantasyTeams;
  beforeEach('given mock data', async () => {
    proLeague = await givenProLeague();
    ({proPlayers} = await new MockProTeamBuilder()
      .withProTeamData({proLeagueId: proLeague.id})
      .withNProPlayers(5)
      .buildAndPersist());
    ({fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({
        ownerId: customer.id,
        currentPickEndsAt: new Date(),
      })
      .allowingProLeagues([proLeague])
      .withNFantasyTeams(1)
      .andTeamOwners([customer])
      .containingProPlayers(proPlayers)
      .buildAndPersist());
  });

  afterEach(closeRunningServer);

  it('should reject an unauthenticated user', next => {
    const socket = givenSocket(draftNamespaceUrl);
    socket.on('error', err => {
      expect(err).to.eql('Missing access token');
      next();
    });
  });

  it('should reject a user who does not belong to the league', async () => {
    const {token: otherCustomerToken} = await givenLoggedInCustomer({
      username: 'Other customer',
      email: 'other@example.com',
    });
    const socket = givenSocket(draftNamespaceUrl, {
      query: {token: otherCustomerToken.id},
    });
    await new Promise((resolve, reject) => {
      socket.emit(
        'joinDraftLobby',
        realtimeServer.buildEvent({
          fantasyLeagueId: fantasyLeague.id,
        }),
        response => {
          expect(response.success).to.be.false();
          resolve();
        }
      );
      socket.on('error', reject);
    });
  });

  it('should allow the user to join a lobby', async () => {
    await new Promise((resolve, reject) => {
      customerSocket.emit(
        'joinDraftLobby',
        realtimeServer.buildEvent({
          fantasyLeagueId: fantasyLeague.id,
        }),
        response => {
          expect(response.message).to.be.null();
          expect(response.success).to.be.true();
          resolve();
        }
      );
      customerSocket.on('error', reject);
    });
  });

  it('should send the user any events they missed when a lastEventId is supplied', async () => {
    // Given a series of events in chronological order
    const events = [];
    for (let i = 0; i < 5; i++) {
      events.push(await givenDraftEvent({
        fantasyLeagueId: fantasyLeague.id,
        eventName: 'dummy',
      }));
      await sleep(1);
    }

    // Let up listeners
    const receiveEventsPromise = new Promise((resolve, reject) => {
      const receivedEvents = [];
      customerSocket.on('dummy', event => {
        receivedEvents.push(event);
        if (receivedEvents.length === 3) {
          resolve(receivedEvents);
        }
      });
    });

    // Join the lobby
    customerSocket.emit(
      'joinDraftLobby',
      realtimeServer.buildEvent({
        fantasyLeagueId: fantasyLeague.id,
        // Tells the server we already have the state from events indices 0 and 1 and need 2, 3, and 4.
        lastEventId: events[1].id,
      })
    );

    // Wait for catch-up events from server
    const receivedEvents = sortBy(await receiveEventsPromise, 'at');

    // Do assertion
    const expectedEvents = events.slice(2).map(e => {
      e = e.toJSON();
      e.at = new Date(e.at).toISOString();
      return pick(e, ['id', 'at', 'data']);
    });
    expect(receivedEvents).to.eql(expectedEvents);
  });

  it('should send the user all events when lastEventId is falsey', async () => {
    // Given a series of events in chronological order
    const events = [];
    for (let i = 0; i < 5; i++) {
      events.push(await givenDraftEvent({
        fantasyLeagueId: fantasyLeague.id,
        eventName: 'dummy',
      }));
      await sleep(1);
    }

    // Let up listeners
    const receiveEventsPromise = new Promise((resolve, reject) => {
      const receivedEvents = [];
      customerSocket.on('dummy', event => {
        receivedEvents.push(event);
        if (receivedEvents.length === 3) {
          resolve(receivedEvents);
        }
      });
    });

    // Join the lobby
    customerSocket.emit(
      'joinDraftLobby',
      realtimeServer.buildEvent({
        fantasyLeagueId: fantasyLeague.id,
        lastEventId: null,
      })
    );

    // Wait for catch-up events from server
    const receivedEvents = sortBy(await receiveEventsPromise, 'at');

    // Do assertion
    const expectedEvents = events.map(e => {
      e = e.toJSON();
      e.at = new Date(e.at).toISOString();
      return pick(e, ['id', 'at', 'data']);
    });
    expect(receivedEvents).to.eql(expectedEvents);
  });

  it('should notify the lobby that a user has joined', done => {
    customerSocket.emit(
      'joinDraftLobby',
      realtimeServer.buildEvent({
        fantasyLeagueId: fantasyLeague.id,
      })
    );
    customerSocket.once('userJoined', event => {
      expect(event.data.userId).to.eql(customer.id);
      expect(event.data.username).to.eql(customer.username);
      done();
    });
    customerSocket.once('error', done);
  });
});
