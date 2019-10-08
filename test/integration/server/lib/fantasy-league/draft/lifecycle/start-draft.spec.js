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
const sinon = require('sinon');

describe('integration: DraftLifecycle (startDraft)', () => {
  beforeEach(givenEmptyDatabase);

  let httpServerAddress, httpServer, draftNamespaceUrl;
  beforeEach('given running realtime server', async () => {
    ({httpServerAddress, httpServer} = await givenRunningServer(app));
    draftNamespaceUrl = httpServerAddress + app.models.Draft.IO_NAMESPACE;
  });

  let customerSocket, customer;
  beforeEach('given authenticated customer socket in the draft lobby', async () => {
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
        draftDate: new Date(new Date() - 1000),
        leagueState: FantasyLeague.LEAGUE_STATE.PRE_DRAFT,
      })
      .allowingProLeagues([proLeague])
      .withFantasyTeams([{readyForPlay: true}])
      .andTeamOwners([customer])
      .containingProPlayers(proPlayers)
      .buildAndPersist());
  });

  beforeEach('given customer in draft lobby', async () => {
    await givenCustomerInDraftLobby(customerSocket, fantasyLeague);
  });

  afterEach(closeRunningServer);
  afterEach(sinon.restore.bind(sinon));

  it('should notify clients', async () => {
    const draftStartEventPromise = new Promise((resolve, reject) => {
      customerSocket.once('draftStart', event => resolve());
    });

    await DraftLifecycle.startDraft(fantasyLeague);

    await draftStartEventPromise;
  });

  it('should abort the draft and notify clients if not enough users have joined', async () => {
    fantasyLeague.minTeams = 2;
    await fantasyLeague.save();

    await DraftLifecycle.startDraft(fantasyLeague);

    fantasyLeague = await fantasyLeague.reload();
    expect(fantasyLeague.leagueState).to.eql(FantasyLeague.LEAGUE_STATE.CANCELLED);
  });

  it('should update the league state', async () => {
    await DraftLifecycle.startDraft(fantasyLeague);

    fantasyLeague = await fantasyLeague.reload();
    expect(fantasyLeague.leagueState).to.eql(FantasyLeague.LEAGUE_STATE.DRAFTING);
  });

  it('should randomize the team order', async () => {
    await DraftLifecycle.startDraft(fantasyLeague);

    // Just testing that the pickOrder is set,
    // otherwise have to mock the lodash shuffle method
    const team = await fantasyTeams[0].reload();
    expect(team.pickOrder).to.eql(0);
  });

  it('should start the first draft turn', async () => {
    const mock = sinon.mock(DraftLifecycle).expects('startNextDraftTurn').once();

    await DraftLifecycle.startDraft(fantasyLeague);

    mock.verify();
  });

  it('should notify clients when the draft starts via push notification');
});
