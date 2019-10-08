'use strict';

const app = require('../../../../../../../server/server');
const expect = require('../../../../../../helpers/expect-preconfigured');
const {givenEmptyDatabase} = require('../../../../../../helpers/database.helpers');
const {
  givenAuthenticatedCustomerSocket,
  givenRunningServer,
  closeRunningServer,
} = require('../../../../../../helpers/realtime-server.helpers');
const {givenProLeague} = require('../../../../../../helpers/pro-league.helpers');
const {MockProTeamBuilder} = require('../../../../../../helpers/pro-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../../../helpers/fantasy-league.helpers');
const realtimeServer = require('../../../../../../../server/lib/realtime-server');

describe('integration: DraftClientEventHandlers (pickPlayer)', () => {
  beforeEach(givenEmptyDatabase);

  let httpServerAddress, httpServer, draftNamespaceUrl;
  beforeEach('given running realtime server', async () => {
    ({httpServerAddress, httpServer} = await givenRunningServer(app));
    draftNamespaceUrl = httpServerAddress + app.models.Draft.IO_NAMESPACE;
  });

  let customerSocket, customer, otherCustomerSocket, otherCustomer;
  beforeEach('given authenticated customer sockets in the draft lobby', async () => {
    ({customer, socket: customerSocket} = await givenAuthenticatedCustomerSocket(draftNamespaceUrl));
    ({
      customer: otherCustomer,
      socket: otherCustomerSocket,
    } = await givenAuthenticatedCustomerSocket(draftNamespaceUrl, {
      username: 'Other',
      email: 'other-customer@example.com',
    }));
  });

  let proLeague, proPlayers, fantasyLeague, fantasyTeams;
  beforeEach('given mock data', async () => {
    proLeague = await givenProLeague();
    ({proPlayers} = await new MockProTeamBuilder()
      .withProTeamData({proLeagueId: proLeague.id})
      .withNProPlayers(1)
      .buildAndPersist());
    ({fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({
        ownerId: customer.id,
        currentPickNumber: 1,
        timePerPick: 30,
        currentPickStartsAt: new Date() - 31000,
        currentPickEndsAt: new Date() - 1000,
        draftDate: new Date(new Date() - 32000),
        leagueState: app.models.FantasyLeague.LEAGUE_STATE.DRAFTING,
      })
      .allowingProLeagues([proLeague])
      .withFantasyTeams([{
        ownerId: customer.id,
        readyForPlay: true,
      }, {
        ownerId: otherCustomer.id,
        readyForPlay: true,
      }])
      .buildAndPersist());
    await fantasyLeague.updateAttribute('currentPickingFantasyTeamId', fantasyTeams[0].id);
  });

  afterEach(closeRunningServer);

  /**
   * Promise wrapper to send a pickPlayer request
   * @param {object} data Data to send, minus fantasyLeagueId (pre-filled for convenience)
   */
  async function sendPickPlayerRequest(data) {
    return new Promise((resolve, reject) => {
      customerSocket.emit(
        'pickPlayer',
        realtimeServer.buildEvent(Object.assign({
          fantasyLeagueId: fantasyLeague.id,
        }, data)),
        resolve,
      );
      customerSocket.on('error', reject);
    });
  }

  it('should allow a player to be drafted', async () => {
    const response = await sendPickPlayerRequest({
      proPlayerId: proPlayers[0].id,
    });
    expect(response.message).to.be.null();
    expect(response.success).to.be.true();

    const playerWasAddedToTeam = Boolean(await app.models.FantasyTeamPlayer.findOne({
      where: {
        fantasyTeamId: fantasyTeams[0].id,
        proPlayerId: proPlayers[0].id,
      },
    }));
    expect(playerWasAddedToTeam).to.be.true();
  });

  it('should notify clients when a player is drafted', async () => {
    // Need to join the lobby to receive events
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

    const playerDraftedPromise = new Promise((resolve, reject) => {
      customerSocket.once('playerDrafted', event => {
        expect(event.data).to.eql({
          fantasyLeagueId: fantasyLeague.id,
          fantasyTeamId: fantasyTeams[0].id,
          pickNumber: fantasyLeague.currentPickNumber,
          teamOwnerId: customer.id,
          teamOwnerUsername: customer.username,
          proPlayerId: proPlayers[0].id,
          wasAutoSelected: false,
        });
        resolve();
      });
      customerSocket.once('error', reject);
    });

    const response = await sendPickPlayerRequest({
      proPlayerId: proPlayers[0].id,
    });

    await playerDraftedPromise;
  });

  it('should not allow users who are not the active picker to draft a player', async () => {
    await fantasyLeague.updateAttribute('currentPickingFantasyTeamId', fantasyTeams[1].id);

    const response = await sendPickPlayerRequest({
      proPlayerId: proPlayers[0].id,
    });
    expect(response.success).to.be.false();
  });

  it('should not allow clients to draft a player that was already drafted', async () => {
    await app.models.FantasyTeamPlayer.create({
      proPlayerId: proPlayers[0].id,
      fantasyTeamId: fantasyTeams[1].id,
    });

    const response = await sendPickPlayerRequest({
      proPlayerId: proPlayers[0].id,
    });
    expect(response.success).to.be.false();
  });
});
