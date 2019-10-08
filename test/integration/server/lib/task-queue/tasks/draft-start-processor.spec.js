'use strict';

const app = require('../../../../../../server/server');
const draftStartProcessor = require('../../../../../../server/lib/task-queue/tasks/draft-start-processor');
const DraftLifecycle = require('../../../../../../server/lib/fantasy-league/draft/lifecycle');
const {FantasyLeague} = app.models;
const {givenEmptyDatabase} = require('../../../../../helpers/database.helpers');
const {
  givenRunningServer,
  closeRunningServer,
} = require('../../../../../helpers/realtime-server.helpers');
const {givenCustomer} = require('../../../../../helpers/customer.helpers');
const {givenProLeague} = require('../../../../../helpers/pro-league.helpers');
const {MockProTeamBuilder} = require('../../../../../helpers/pro-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../../helpers/fantasy-league.helpers');
const sinon = require('sinon');

/** No-op drop-in for Socket.io's Job object */
class MockJob {
  progress() {}
}

describe('integration: draft start processor task', () => {
  beforeEach(givenEmptyDatabase);

  beforeEach('given running realtime server', async () => {
    await givenRunningServer(app);
  });

  let customer;
  beforeEach('given authenticated customer socket in the draft lobby', async () => {
    customer = await givenCustomer();
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

  afterEach(closeRunningServer);
  afterEach(sinon.restore.bind(sinon));

  it('should start the draft at the correct time', async () => {
    const mock = sinon.mock(DraftLifecycle)
      .expects('startDraft')
      .once()
      .withArgs(sinon.match({id: fantasyLeague.id}));

    await draftStartProcessor(new MockJob());

    mock.verify();
  });
});
