'use strict';

const app = require('../../../../../../../server/server');
const DraftLifecycle = require('../../../../../../../server/lib/fantasy-league/draft/lifecycle');
const {FantasyLeague} = app.models;
const {givenEmptyDatabase} = require('../../../../../../helpers/database.helpers');
const {
  givenAuthenticatedCustomerSocket,
  givenRunningServer,
  closeRunningServer,
} = require('../../../../../../helpers/realtime-server.helpers');
const {givenCustomerInDraftLobby} = require('../../../../../../helpers/draft-event.helpers');
const {givenProLeague} = require('../../../../../../helpers/pro-league.helpers');
const {MockProTeamBuilder} = require('../../../../../../helpers/pro-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../../../helpers/fantasy-league.helpers');
const sinon = require('sinon');

describe('integration: DraftLifecycle (endDraftTurn)', () => {
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
      .withNProPlayers(4)
      .buildAndPersist());
    ({fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({
        ownerId: customer.id,
        currentPickNumber: 1,
        timePerPick: 30,
        currentPickStartsAt: new Date() - 31000,
        currentPickEndsAt: new Date() - 1000,
        draftDate: new Date(new Date() - 32000),
        leagueState: FantasyLeague.LEAGUE_STATE.DRAFTING,
      })
      .allowingProLeagues([proLeague])
      .withFantasyTeams([{
        ownerId: customer.id,
        readyForPlay: true,
      }, {
        ownerId: otherCustomer.id,
        readyForPlay: true,
      }])
      .containingProPlayers(proPlayers)
      .buildAndPersist());
  });

  beforeEach('given customer in draft lobby', async () => {
    await Promise.all([
      givenCustomerInDraftLobby(customerSocket, fantasyLeague),
      givenCustomerInDraftLobby(otherCustomerSocket, fantasyLeague),
    ]);
  });

  afterEach(closeRunningServer);
  afterEach(sinon.restore.bind(sinon));

  it('should notify clients', async () => {
    const draftStartEventPromise = new Promise((resolve, reject) => {
      let eventsReceived = 0;
      customerSocket.once('pickTurnEnded', onEvent);
      otherCustomerSocket.once('pickTurnEnded', onEvent);
      function onEvent(event) {
        eventsReceived++;
        if (eventsReceived === 2) resolve();
      }
    });

    await DraftLifecycle.endDraftTurn(fantasyLeague);

    await draftStartEventPromise;
  });

  it('should autoselect if the player has not made a selection, and notify clients');

  it('should end the draft if all teams are full, and notify clients', async () => {
    await fantasyLeague.updateAttribute('playersPerTeam', 2);
    // All teams should be full because we only added 4 pro players to the DB

    const mock = sinon.mock(DraftLifecycle).expects('endDraft').once();

    await DraftLifecycle.endDraftTurn(fantasyLeague);

    mock.verify();
  });

  it('should start the next turn if not all teams are full', async () => {
    await fantasyLeague.updateAttribute('playersPerTeam', 3);
    // All teams should be NOT be full because we only added 4 pro players to the DB

    const mock = sinon.mock(DraftLifecycle).expects('startNextDraftTurn').once();

    await DraftLifecycle.endDraftTurn(fantasyLeague);

    mock.verify();
  });
});
