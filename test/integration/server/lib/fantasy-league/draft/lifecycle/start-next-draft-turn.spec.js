'use strict';

const app = require('../../../../../../../server/server');
const DraftLifecycle = require('../../../../../../../server/lib/fantasy-league/draft/lifecycle');
const expect = require('../../../../../../helpers/expect-preconfigured');
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

describe('integration: DraftLifecycle (startNextDraftTurn)', () => {
  beforeEach(givenEmptyDatabase);

  let httpServerAddress, httpServer, draftNamespaceUrl;
  beforeEach('given running realtime server', async () => {
    ({httpServerAddress, httpServer} = await givenRunningServer(app));
    draftNamespaceUrl = httpServerAddress + app.models.Draft.IO_NAMESPACE;
  });

  let customerSocket, customer, otherCustomerSocket, otherCustomer;
  beforeEach('given authenticated customer socket in the draft lobby', async () => {
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
      .withNProPlayers(5)
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

  it('should notify clients', async () => {
    const draftStartEventPromise = new Promise((resolve, reject) => {
      let eventsReceived = 0;
      customerSocket.once('pickTurnStarted', onEvent);
      otherCustomerSocket.once('pickTurnStarted', onEvent);
      function onEvent(event) {
        eventsReceived++;
        if (eventsReceived === 2) resolve();
      }
    });

    await DraftLifecycle.startNextDraftTurn(fantasyLeague);

    await draftStartEventPromise;
  });

  it('should update the league', async () => {
    await DraftLifecycle.startNextDraftTurn(fantasyLeague);

    await fantasyLeague.reload();
    expect(fantasyLeague.currentPickNumber).to.eql(2);
    const expectedNewPickingTeam = fantasyTeams.find(t => t.ownerId === otherCustomer.id);
    expect(fantasyLeague.currentPickingFantasyTeamId).to.eql(expectedNewPickingTeam.id);
    expect(fantasyLeague.currentPickStartsAt.getTime()).to.be.closeTo(new Date().getTime(), 500);
    expect(fantasyLeague.currentPickEndsAt.getTime())
      .to.eql(fantasyLeague.currentPickStartsAt.getTime() + (fantasyLeague.timePerPick * 1000));
  });
});
