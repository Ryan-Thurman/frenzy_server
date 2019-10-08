'use strict';

const app = require('../../../../../server/server');
const expect = require('../../../../helpers/expect-preconfigured');
const {givenCustomer} = require('../../../../helpers/customer.helpers');
const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {givenProLeague} = require('../../../../helpers/pro-league.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../helpers/fantasy-league.helpers');

const {FantasyLeague} = app.models;

const {
  generateWeeklyLeague,
  DAY_OF_WEEK,
} = require('../../../../../server/lib/fantasy-league/league-generator');

const MONDAY = '2018-11-05';
const FRIDAY = '2018-11-09';
const SATURDAY = '2018-11-10';
const NEXT_MONDAY = '2018-11-12';

const THREE_PM_PT = 'T15:00:00-08:00';
const NINE_PM_PT = 'T21:00:00-08:00';
const TEN_PM_PT = 'T22:00:00-08:00';
const ELEVEN_PM_PT = 'T23:00:00-08:00';

describe('integration: league generator', () => {
  beforeEach(givenEmptyDatabase);

  describe('generateWeeklyLeague', () => {
    describe('given no existing league', () => {
      it('at 3pm Monday, should create a Tuesday league that drafts that night', async () => {
        const now = new Date(MONDAY + THREE_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.TUESDAY, [], now);
        expect(newLeague).to.exist();
        expect(newLeague.startDate).to.equalTime(new Date(MONDAY + ELEVEN_PM_PT));
        expect(newLeague.draftDate).to.equalTime(new Date(MONDAY + NINE_PM_PT));
        expect(newLeague.endDate).to.equalTime(new Date(NEXT_MONDAY + ELEVEN_PM_PT));
        expect(newLeague.dayOfWeek).to.equal(DAY_OF_WEEK.TUESDAY);
      });

      it('at 3pm Friday, should create a Saturday league that drafts that night', async () => {
        const now = new Date(FRIDAY + THREE_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.SATURDAY, [], now);
        expect(newLeague).to.exist();
        expect(newLeague.startDate).to.equalTime(new Date(FRIDAY + ELEVEN_PM_PT));
        expect(newLeague.draftDate).to.equalTime(new Date(FRIDAY + NINE_PM_PT));
        expect(newLeague.dayOfWeek).to.equal(DAY_OF_WEEK.SATURDAY);
      });

      it('at 3pm Saturday, should create a Sunday league that drafts that night', async () => {
        const now = new Date(SATURDAY + THREE_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.SUNDAY, [], now);
        expect(newLeague).to.exist();
        expect(newLeague.startDate).to.equalTime(new Date(SATURDAY + ELEVEN_PM_PT));
        expect(newLeague.draftDate).to.equalTime(new Date(SATURDAY + NINE_PM_PT));
        expect(newLeague.dayOfWeek).to.equal(DAY_OF_WEEK.SUNDAY);
      });

      it('at 10pm Monday, should create a Tuesday league that drafts next week', async () => {
        const now = new Date(MONDAY + TEN_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.TUESDAY, [], now);
        expect(newLeague).to.exist();
        expect(newLeague.startDate).to.equalTime(new Date(NEXT_MONDAY + ELEVEN_PM_PT));
        expect(newLeague.draftDate).to.equalTime(new Date(NEXT_MONDAY + NINE_PM_PT));
        expect(newLeague.dayOfWeek).to.equal(DAY_OF_WEEK.TUESDAY);
      });

      it('should associate with pro leagues', async () => {
        const proLeague = await givenProLeague();
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.TUESDAY, [proLeague]);
        const allowedProLeagues = await newLeague.allowedProLeagues.find();
        expect(allowedProLeagues[0]).to.include({
          id: proLeague.id,
        });
      });
    });

    describe('given an existing full league', () => {
      beforeEach('given a full fantasy league', async () => {
        await new MockFantasyLeagueBuilder()
          .withFantasyLeagueData({
            leagueState: FantasyLeague.LEAGUE_STATE.PRE_DRAFT,
            leagueDuration: FantasyLeague.LEAGUE_DURATION.WEEKLY,
            dayOfWeek: DAY_OF_WEEK.TUESDAY,
            startDate: new Date(MONDAY + ELEVEN_PM_PT),
            draftDate: new Date(MONDAY + NINE_PM_PT),
            endDate: new Date(NEXT_MONDAY + ELEVEN_PM_PT),
            maxTeams: 16,
          })
          .withNFantasyTeams(16)
          .andTeamOwners([await givenCustomer()])
          .buildAndPersist();
      });

      it('at 3pm Monday, should create a Tuesday league that drafts that night', async () => {
        const now = new Date(MONDAY + THREE_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.TUESDAY, [], now);
        expect(newLeague).to.exist();
        expect(newLeague.startDate).to.equalTime(new Date(MONDAY + ELEVEN_PM_PT));
        expect(newLeague.draftDate).to.equalTime(new Date(MONDAY + NINE_PM_PT));
        expect(newLeague.endDate).to.equalTime(new Date(NEXT_MONDAY + ELEVEN_PM_PT));
        expect(newLeague.dayOfWeek).to.equal(DAY_OF_WEEK.TUESDAY);
      });

      it('at 10pm Monday, should create a Tuesday league that drafts next week', async () => {
        const now = new Date(MONDAY + TEN_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.TUESDAY, [], now);
        expect(newLeague).to.exist();
        expect(newLeague.startDate).to.equalTime(new Date(NEXT_MONDAY + ELEVEN_PM_PT));
        expect(newLeague.draftDate).to.equalTime(new Date(NEXT_MONDAY + NINE_PM_PT));
        expect(newLeague.dayOfWeek).to.equal(DAY_OF_WEEK.TUESDAY);
      });
    });

    describe('with an existing available league', () => {
      beforeEach('given a fantasy league with space', async () => {
        await new MockFantasyLeagueBuilder()
          .withFantasyLeagueData({
            leagueState: FantasyLeague.LEAGUE_STATE.PRE_DRAFT,
            leagueDuration: FantasyLeague.LEAGUE_DURATION.WEEKLY,
            dayOfWeek: DAY_OF_WEEK.TUESDAY,
            startDate: new Date(MONDAY + ELEVEN_PM_PT),
            draftDate: new Date(MONDAY + NINE_PM_PT),
            endDate: new Date(NEXT_MONDAY + ELEVEN_PM_PT),
            maxTeams: 16,
          })
          .withNFantasyTeams(8)
          .andTeamOwners([await givenCustomer()])
          .buildAndPersist();
      });

      it('at 3pm Monday, should create no new Tuesday league', async () => {
        const now = new Date(MONDAY + THREE_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.TUESDAY, [], now);
        expect(newLeague).to.not.exist();
      });

      it('at 10pm Monday, should create a Tuesday league that drafts next week', async () => {
        const now = new Date(MONDAY + TEN_PM_PT);
        const newLeague = await generateWeeklyLeague(DAY_OF_WEEK.TUESDAY, [], now);
        expect(newLeague).to.exist();
        expect(newLeague.startDate).to.equalTime(new Date(NEXT_MONDAY + ELEVEN_PM_PT));
        expect(newLeague.draftDate).to.equalTime(new Date(NEXT_MONDAY + NINE_PM_PT));
        expect(newLeague.dayOfWeek).to.equal(DAY_OF_WEEK.TUESDAY);
      });
    });
  });
});
