'use strict';

const app = require('../../../../../../server/server');
const autoSelect = require('../../../../../../server/lib/fantasy-league/draft/auto-select');
const expect = require('../../../../../helpers/expect-preconfigured');
const {FantasyLeague} = app.models;
const {givenEmptyDatabase} = require('../../../../../helpers/database.helpers');
const {
  givenAuthenticatedCustomerSocket,
  givenRunningServer,
  closeRunningServer,
} = require('../../../../../helpers/realtime-server.helpers');
const {givenCustomerInDraftLobby} = require('../../../../../helpers/draft-event.helpers');
const {givenProLeague} = require('../../../../../helpers/pro-league.helpers');
const {MockProTeamBuilder} = require('../../../../../helpers/pro-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../../helpers/fantasy-league.helpers');

const {DraftEvent, FantasyTeamPlayer, FantasyTeamWatchlist} = app.models;

describe('integration: autoSelect', () => {
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
        pickOrder: 1,
      }, {
        ownerId: otherCustomer.id,
        readyForPlay: true,
        pickOrder: 2,
      }])
      .buildAndPersist());
    await fantasyLeague.updateAttribute('currentPickingFantasyTeamId', fantasyTeams[0].id);
  });

  beforeEach('given customer in draft lobby', async () => {
    await Promise.all([
      givenCustomerInDraftLobby(customerSocket, fantasyLeague),
      givenCustomerInDraftLobby(otherCustomerSocket, fantasyLeague),
    ]);
  });

  afterEach(closeRunningServer);

  it('should skip if a pick was made this round', async () => {
    await FantasyTeamPlayer.create({
      fantasyTeamId: fantasyTeams[0].id,
      proPlayerId: proPlayers[0].id,
    });
    await DraftEvent.send(fantasyLeague.id, 'playerDrafted', {
      fantasyLeagueId: fantasyLeague.id,
      fantasyTeamId: fantasyTeams[0].id,
      pickNumber: fantasyLeague.currentPickNumber,
      teamOwnerId: customer.id,
      teamOwnerUsername: customer.username,
      proPlayerId: proPlayers[0].id,
      wasAutoSelected: false,
    });

    await autoSelect.autoSelectForCurrentPick(fantasyLeague);

    const fantasyTeamPlayers = await FantasyTeamPlayer.find();
    expect(fantasyTeamPlayers).to.have.lengthOf(1);
  });

  it('should select the first player from the watchlist', async () => {
    // Team wants two players
    await FantasyTeamWatchlist.create({
      fantasyTeamId: fantasyTeams[0].id,
      proPlayerId: proPlayers[0].id,
      order: 1,
    });
    await FantasyTeamWatchlist.create({
      fantasyTeamId: fantasyTeams[0].id,
      proPlayerId: proPlayers[1].id,
      order: 2,
    });

    await autoSelect.autoSelectForCurrentPick(fantasyLeague);

    const fantasyTeamPlayers = await FantasyTeamPlayer.find();
    expect(fantasyTeamPlayers[0]).to.have.property('proPlayerId', proPlayers[0].id);
  });

  it('should select a random eligible player if all players on the watchlist are assigned', async () => {
    // Second team owns player
    await FantasyTeamPlayer.create({
      fantasyTeamId: fantasyTeams[1].id,
      proPlayerId: proPlayers[0].id,
    });
    // First team wants player
    await FantasyTeamWatchlist.create({
      fantasyTeamId: fantasyTeams[0].id,
      proPlayerId: proPlayers[0].id,
      order: 1,
    });

    await autoSelect.autoSelectForCurrentPick(fantasyLeague);

    const validPicks = proPlayers.slice(1);
    const selectedPlayer = await FantasyTeamPlayer.findOne({
      fantasyTeamId: fantasyTeams[0].id,
    });
    expect(validPicks.map(p => p.id)).to.include(selectedPlayer.proPlayerId);
  });

  it('should notify the lobby', async () => {
    await FantasyTeamWatchlist.create({
      fantasyTeamId: fantasyTeams[0].id,
      proPlayerId: proPlayers[0].id,
      order: 1,
    });

    const playerDraftedEventPromise = new Promise((resolve, reject) => {
      customerSocket.once('playerDrafted', resolve);
      customerSocket.on('error', reject);
    });

    await autoSelect.autoSelectForCurrentPick(fantasyLeague);

    const playerDraftedEvent = await playerDraftedEventPromise;
    expect(playerDraftedEvent.data).to.eql({
      fantasyLeagueId: fantasyLeague.id,
      fantasyTeamId: fantasyTeams[0].id,
      pickNumber: fantasyLeague.currentPickNumber,
      teamOwnerId: customer.id,
      teamOwnerUsername: customer.username,
      proPlayerId: proPlayers[0].id,
      wasAutoSelected: true,
    });
  });

  it('should skip and notify the lobby if no eligible players remain in the allowed pro leagues', async () => {
    for (const player of proPlayers) {
      // Second team owns all players
      await FantasyTeamPlayer.create({
        fantasyTeamId: fantasyTeams[1].id,
        proPlayerId: player.id,
      });
    }

    const noPlayerDraftedEventPromise = new Promise((resolve, reject) => {
      customerSocket.once('noPlayerDrafted', resolve);
      customerSocket.on('error', reject);
    });

    await autoSelect.autoSelectForCurrentPick(fantasyLeague);

    const noPlayerDraftedEvent = await noPlayerDraftedEventPromise;
    expect(noPlayerDraftedEvent.data).to.eql({
      fantasyLeagueId: fantasyLeague.id,
      fantasyTeamId: fantasyTeams[0].id,
      pickNumber: fantasyLeague.currentPickNumber,
    });
  });
});
