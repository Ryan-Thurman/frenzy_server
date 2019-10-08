'use strict';

const app = require('../../../../server/server');
const expect = require('../../../helpers/expect-preconfigured');
const moment = require('moment');
const {givenNCustomers} = require('../../../helpers/customer.helpers');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {givenProLeague} = require('../../../helpers/pro-league.helpers');
const {MockFantasyEventBuilder} = require('../../../helpers/fantasy-event.helpers');
const {MockFantasyLeagueBuilder} = require('../../../helpers/fantasy-league.helpers');
const {MockProTeamBuilder} = require('../../../helpers/pro-team.helpers');

const {
  FantasyLeague,
  FantasyEventTeam,
} = app.models;

describe('integration: FantasyEvent (remote)', () => {
  beforeEach(givenEmptyDatabase);

  let customers, fantasyLeague, fantasyTeams, proLeague, proPlayers, fantasyEvent;
  beforeEach('given mock data', async () => {
    customers = await givenNCustomers(2);
    proLeague = await givenProLeague();
    ({proPlayers} = await new MockProTeamBuilder()
      .withProTeamData({proLeagueId: proLeague.id})
      .withNProPlayers(2)
      .buildAndPersist());
    ({fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({
        ownerId: customers[0].id,
        leagueState: FantasyLeague.LEAGUE_STATE.IN_PROGRESS,
      })
      .allowingProLeagues([proLeague])
      .withNFantasyTeams(2)
      .andTeamOwners(customers)
      .containingProPlayers(proPlayers)
      .buildAndPersist());
    fantasyEvent = await new MockFantasyEventBuilder()
      .withFantasyEventData({
        fantasyLeagueId: fantasyLeague.id,
        startDate: moment().subtract(1, 'week').toDate(),
        endDate: moment().subtract(1, 'hour').toDate(),
      })
      .withParticipatingFantasyTeams(fantasyTeams)
      .buildAndPersist();
  });

  describe('prototype.updateWinner', () => {
    it('should declare a winner for a completed fantasy event', async () => {
      const fantasyEventTeams = await FantasyEventTeam.find();
      await fantasyEventTeams[0].updateAttribute('points', 1000);
      fantasyEvent = await fantasyEvent.updateWinner();
      expect(fantasyEvent.winnerId).to.eql(fantasyEventTeams[0].fantasyTeamId);
    });

    it('should not declare a winner for an incomplete fantasy event', async () => {
      await fantasyEvent.updateAttribute('endDate', moment().add(1, 'day').toDate());

      const fantasyEventTeams = await FantasyEventTeam.find();
      await fantasyEventTeams[0].updateAttribute('points', 1000);
      fantasyEvent = await fantasyEvent.updateWinner();
      expect(fantasyEvent.winnerId).to.be.null();
    });
  });
});
