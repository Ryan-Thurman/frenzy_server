'use strict';

const app = require('../../../../../server/server');
const expect = require('../../../../helpers/expect-preconfigured');
const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {givenLoggedInCustomer} = require('../../../../helpers/customer.helpers');
const {givenProLeague} = require('../../../../helpers/pro-league.helpers');
const {MockProTeamBuilder} = require('../../../../helpers/pro-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../helpers/fantasy-league.helpers');

const {Draft} = app.models;

describe('integration: Draft (remote methods)', () => {
  beforeEach(givenEmptyDatabase);

  let customer, token, proLeague, proPlayers, fantasyLeague, fantasyTeams;
  beforeEach('given mock data', async () => {
    ({customer, token} = await givenLoggedInCustomer());
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
      .containingProPlayers(proPlayers.slice(0, 3))
      .buildAndPersist());
  });

  describe('createFromFantasyLeague', () => {
    it('should copy the data', async () => {
      const draft = await Draft.createFromFantasyLeague(fantasyLeague);

      // Fantasy-league
      expect(draft.fantasyLeagueId).to.eql(fantasyLeague.id);
      expect(draft.fantasyLeague().toObject()).to.eql(fantasyLeague.toObject());

      // Top-level metadata
      expect(draft.currentPickNumber)
        .to.be.a('number')
        .and.to.equal(fantasyLeague.currentPickNumber);
      expect(draft.timePerPick)
        .to.be.a('number')
        .and.to.equal(fantasyLeague.timePerPick);
      expect(draft.currentPickEndsAt).to.be.a('date');
      expect(draft.currentPickEndsAt.toISOString())
        .to.eql(fantasyLeague.currentPickEndsAt.toISOString());
    });

    it('should load fantasy teams with players', async () => {
      const draft = await Draft.createFromFantasyLeague(fantasyLeague);

      // teams
      const teams = await draft.teams.find();
      const draftTeam = teams[0].toObject();
      expect(draftTeam).to.eql(fantasyTeams[0].toObject());

      // players
      // Empty object is required as an arg for some reason,
      // seems to be a loopback bug
      const players = await teams[0].players({});
      expect(players).to.have.lengthOf(3);
    });

    it('should populate available players', async ()=>{
      const draft = await Draft.createFromFantasyLeague(fantasyLeague);

      // Need object arg to work around loopback bug
      const availablePlayers = await draft.availablePlayers({});
      expect(availablePlayers).to.have.lengthOf(2);
    });
  });
});
