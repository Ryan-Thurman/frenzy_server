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

describe('integration: DraftLifecycle (endDraft)', () => {
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
        leagueState: FantasyLeague.LEAGUE_STATE.DRAFTING,
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

  it('update the league state', async () => {
    await DraftLifecycle.endDraft(fantasyLeague);

    fantasyLeague = await fantasyLeague.reload();
    expect(fantasyLeague.leagueState).to.eql(FantasyLeague.LEAGUE_STATE.POST_DRAFT);
  });

  it('should notify the lobby', async () => {
    const draftStartEventPromise = new Promise((resolve, reject) => {
      customerSocket.once('draftEnd', event => resolve());
    });

    await DraftLifecycle.endDraft(fantasyLeague);

    await draftStartEventPromise;
  });
});
