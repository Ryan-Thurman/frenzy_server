'use strict';

const app = require('../../../../../server/server');
const expect = require('../../../../helpers/expect-preconfigured');
const {
  scheduleSingleFantasyEvent,
  scheduleRoundRobinFantasyEvents,
} = require('../../../../../server/lib/fantasy-league/event-scheduler');
const {givenCustomer} = require('../../../../helpers/customer.helpers');
const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../helpers/fantasy-league.helpers');

const {FantasyLeague, FantasyEvent, FantasyEventTeam} = app.models;

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;

describe('integration: event scheduler', () => {
  const nTeams = 16;

  beforeEach(givenEmptyDatabase);

  let customer, fantasyLeague, fantasyTeams;
  beforeEach('given mock data', async () => {
    customer = await givenCustomer();
    ({fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({
        ownerId: customer.id,
        startDate: new Date(),
        endDate: new Date(new Date() + WEEK),
        leagueState: FantasyLeague.LEAGUE_STATE.POST_DRAFT,
      })
      .withNFantasyTeams(nTeams)
      .andTeamOwners([customer])
      .buildAndPersist());
  });

  describe('scheduleSingleFantasyEvent', () => {
    it('should schedule a fantasy event including all teams', async () => {
      await scheduleSingleFantasyEvent(fantasyLeague);

      // Check number of created events
      const fantasyEvents = await FantasyEvent.find();
      expect(fantasyEvents).to.have.lengthOf(1);

      // Check start and end time
      expect(fantasyEvents[0].startDate.getTime()).to.eql(fantasyLeague.startDate.getTime());
      expect(fantasyEvents[0].endDate.getTime()).to.eql(fantasyLeague.endDate.getTime());

      // Check number of teams
      const fantasyEventTeams = await FantasyEventTeam.find();
      expect(fantasyEventTeams).to.have.lengthOf(fantasyTeams.length);
      for (const fantasyEventTeam of fantasyEventTeams) {
        expect(fantasyEventTeam.fantasyEventId).to.eql(fantasyEvents[0].id);
      }
    });
  });

  describe('scheduleRoundRobinFantasyEvents', () => {
    it('should match every team against every other team once', async () => {
      await scheduleRoundRobinFantasyEvents(fantasyLeague);

      // Check number of events
      const fantasyEvents = await FantasyEvent.find();
      expect(fantasyEvents).to.have.lengthOf(nTeams / 2 * (nTeams - 1));

      // Check matchups, make a hash by team ID
      const matchups = fantasyTeams.reduce((teamsById, currentTeam)=>{
        teamsById[currentTeam.id] = [];
        return teamsById;
      }, {});

      for (const event of fantasyEvents) {
        // Figure out who is playing
        const fantasyEventTeams = await FantasyEventTeam.find({where: {
          fantasyEventId: event.id,
        }});

        expect(fantasyEventTeams).to.have.lengthOf(2);

        // Record matchups
        matchups[fantasyEventTeams[0].fantasyTeamId].push(fantasyEventTeams[1].fantasyTeamId);
        matchups[fantasyEventTeams[1].fantasyTeamId].push(fantasyEventTeams[0].fantasyTeamId);

        // Basic sanity check for schedule
        // @todo Fix rounding errors
        expect(event.startDate.getTime()).to.be.at.least(fantasyLeague.startDate.getTime() - 10 * SECOND);
        expect(event.endDate.getTime()).to.be.at.most(fantasyLeague.endDate.getTime() + 10 * SECOND);
      }

      // Expect each team to play every other team except itself
      for (const opponents of Object.values(matchups)) {
        expect(opponents).to.have.lengthOf(fantasyTeams.length - 1);
      }
      // @todo Optimize execution time (runs a lot of create queries for FantasyEventTeam)
    }).timeout(10000);
  });
});
