'use strict';

const app = require('../../../../../server/server');
const expect = require('../../../../helpers/expect-preconfigured');
const {givenCustomer} = require('../../../../helpers/customer.helpers');
const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {
  givenProEvent,
  givenProEventPlayerStats,
} = require('../../../../helpers/pro-event.helpers');
const {
  MockFantasyEventBuilder,
  givenFantasyEventPlayerStats,
} = require('../../../../helpers/fantasy-event.helpers');
const {givenProLeague} = require('../../../../helpers/pro-league.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../helpers/fantasy-league.helpers');
const {MockProTeamBuilder} = require('../../../../helpers/pro-team.helpers');
const {
  refreshFantasyTeamPlayerProEventMeta,
  refreshFantasyEventTeamPointsForPlayer,
  refreshFantasyEventPlayerStats,
} = require('../../../../../server/lib/fantasy-league/fantasy-stats-aggregator');

const {
  FantasyLeague,
  FantasyTeamPlayerProEventMeta,
  FantasyTeamPlayer,
  FantasyEventPlayerStats,
} = app.models;

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

describe('integration: fantasy stats aggregator', () => {
  beforeEach(givenEmptyDatabase);

  let customer, fantasyLeague, fantasyTeams, proLeague, proPlayers, proEvent;
  beforeEach('given mock data', async () => {
    customer = await givenCustomer();
    proLeague = await givenProLeague();
    ({proPlayers} = await new MockProTeamBuilder()
      .withProTeamData({proLeagueId: proLeague.id})
      .withNProPlayers(2)
      .buildAndPersist());
    ({fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({
        ownerId: customer.id,
        leagueState: FantasyLeague.LEAGUE_STATE.IN_PROGRESS,
      })
      .allowingProLeagues([proLeague])
      .withNFantasyTeams(1)
      .andTeamOwners([customer])
      .containingProPlayers(proPlayers)
      .buildAndPersist());
    proEvent = await givenProEvent();
  });

  describe('refreshFantasyTeamPlayerProEventMeta', () => {
    it('should store a record of each player\'s position on the fantasy team during each pro event', async () => {
      for (const player of proPlayers) {
        await refreshFantasyTeamPlayerProEventMeta(proEvent.id, player.id);
        const playerTeamEventMetaRecords = await FantasyTeamPlayerProEventMeta.find({
          where: {proPlayerId: player.id},
        });
        const fantasyTeamPlayerRecords = await FantasyTeamPlayer.find({
          where: {proPlayerId: player.id},
        });
        expect(playerTeamEventMetaRecords).to.have.lengthOf(fantasyTeamPlayerRecords.length);
        expect(playerTeamEventMetaRecords[0]).to.include({
          fantasyTeamId: fantasyTeamPlayerRecords[0].fantasyTeamId,
          proPlayerId: fantasyTeamPlayerRecords[0].proPlayerId,
          proEventId: proEvent.id,
          position: fantasyTeamPlayerRecords[0].position,
          positionOrder: fantasyTeamPlayerRecords[0].positionOrder,
        });
      }
    });

    it('should store a record of benched players on the fantasy team during each pro event', async () => {
      await FantasyTeamPlayer.updateAll({
        fantasyTeamId: fantasyTeams[0].id,
        proPlayerId: proPlayers[0].id,
      }, {
        position: null,
        positionOrder: null,
      });

      await refreshFantasyTeamPlayerProEventMeta(proEvent.id, proPlayers[0].id);

      const playerTeamEventMetaRecords = await FantasyTeamPlayerProEventMeta.find({
        where: {proPlayerId: proPlayers[0].id},
      });
      expect(playerTeamEventMetaRecords).to.have.lengthOf(1);
      expect(playerTeamEventMetaRecords[0]).to.include({
        fantasyTeamId: fantasyTeams[0].id,
        proPlayerId: proPlayers[0].id,
        proEventId: proEvent.id,
        position: null,
        positionOrder: null,
      });
    });

    it('should not alter records that already exist', async () => {
      // Given a FantasyTeamPlayer record and a FantasyTeamPlayerProEventMeta record
      // with differing position and position order (indicating the player was moved
      // to another position in the lineup or on/off the bench after the pro event started)
      await FantasyTeamPlayer.updateAll({
        fantasyTeamId: fantasyTeams[0].id,
        proPlayerId: proPlayers[0].id,
      }, {
        position: 'F',
        positionOrder: 100,
      });
      await FantasyTeamPlayerProEventMeta.create({
        fantasyTeamId: fantasyTeams[0].id,
        proPlayerId: proPlayers[0].id,
        proEventId: proEvent.id,
        position: 'M',
        positionOrder: 200,
      });

      await refreshFantasyTeamPlayerProEventMeta(proEvent.id, proPlayers[0].id);

      const playerTeamEventMetaRecords = await FantasyTeamPlayerProEventMeta.find({
        where: {proPlayerId: proPlayers[0].id},
      });
      expect(playerTeamEventMetaRecords).to.have.lengthOf(1);
      expect(playerTeamEventMetaRecords[0]).to.include({
        fantasyTeamId: fantasyTeams[0].id,
        proPlayerId: proPlayers[0].id,
        proEventId: proEvent.id,
        position: 'M',
        positionOrder: 200,
      });
    });
  });

  describe('refreshFantasyEventTeamPointsForPlayer', () => {
    it('should correctly retotal points for a team', async () => {
      // Given a fantasy event
      const fantasyEvent = await new MockFantasyEventBuilder()
        .withFantasyEventData({
          fantasyLeagueId: fantasyLeague.id,
          startDate: new Date(proEvent.startDate - 3 * DAY),
          endDate: new Date(proEvent.startDate + 3 * DAY),
        })
        .withParticipatingFantasyTeams(fantasyTeams)
        .buildAndPersist();

      // Given some points for the player of interest
      await givenFantasyEventPlayerStats({
        proPlayerId: proPlayers[0].id,
        fantasyEventId: fantasyEvent.id,
        points: 10,
      });

      // Given some points for some other player on the team
      await givenFantasyEventPlayerStats({
        proPlayerId: proPlayers[1].id,
        fantasyEventId: fantasyEvent.id,
        points: 20,
      });

      await refreshFantasyEventTeamPointsForPlayer(proPlayers[0].id, fantasyEvent.id);

      // Get the updated record
      const fantasyEventTeam = await app.models.FantasyEventTeam.findOne({
        fantasyEventId: fantasyEvent.id,
        fantasyTeamId: fantasyTeams[0].id,
      });

      expect(parseInt(fantasyEventTeam.points)).to.equal(30);
    });
  });

  describe('refreshFantasyEventPlayerStats', () => {
    let proEventPlayerStatsRecord;
    beforeEach('given a pro event player stats record', async () => {
      proEventPlayerStatsRecord = await givenProEventPlayerStats({
        proEventId: proEvent.id,
        proPlayerId: proPlayers[0].id,
      });
    });

    beforeEach('given fantasy team event pro player meta records', async () => {
      for (const player of proPlayers) {
        await refreshFantasyTeamPlayerProEventMeta(proEvent.id, player.id);
      }
    });

    it(`should retotal stats for all time-overlapping fantasy events
        in which a non-benched player is participating`, async () => {
      // In other words, testing when one pro event is relevant to many fantasy events

      // Given another fantasy league
      const {
        fantasyLeague: otherFantasyLeague,
        fantasyTeams: otherFantasyTeams,
      } = await new MockFantasyLeagueBuilder()
        .withFantasyLeagueData({
          ownerId: customer.id,
          leagueState: FantasyLeague.LEAGUE_STATE.IN_PROGRESS,
        })
        .allowingProLeagues([proLeague])
        .withNFantasyTeams(1)
        .andTeamOwners([customer])
        .containingProPlayers(proPlayers)
        .buildAndPersist();

      const iterableLeaguesAndTeams = [
        {
          league: fantasyLeague,
          teams: fantasyTeams,
        }, {
          league: otherFantasyLeague,
          teams: otherFantasyTeams,
        },
      ];

      const fantasyEvents = [];

      // Given some fantasy events in different leagues
      for (const {league, teams} of iterableLeaguesAndTeams) {
        const fantasyEvent = await new MockFantasyEventBuilder()
          .withFantasyEventData({
            fantasyLeagueId: league.id,
            startDate: new Date(proEvent.startDate - 3 * DAY),
            endDate: new Date(proEvent.startDate + 3 * DAY),
          })
          .withParticipatingFantasyTeams(teams)
          .buildAndPersist();
        fantasyEvents.push(fantasyEvent);
      }

      // The actual method being tested, finally
      await refreshFantasyEventPlayerStats(proEventPlayerStatsRecord);

      // Check results
      for (const fantasyEvent in fantasyEvents) {
        const fantasyEventPlayerStatsRecord = await FantasyEventPlayerStats.findOne({
          where: {
            fantasyEventId: fantasyEvent.id,
            proPlayerId: proPlayers[0].id,
          },
        });

        expect(fantasyEventPlayerStatsRecord).to.include({
          minutesPlayed: proEventPlayerStatsRecord.minutesPlayed,
          proEventsPlayed: 1,
          goals: proEventPlayerStatsRecord.goals,
          ownGoals: proEventPlayerStatsRecord.ownGoals,
          goalsAllowed: proEventPlayerStatsRecord.goalsAllowed,
          penaltyShots: proEventPlayerStatsRecord.penaltyShots,
          penaltyGoals: proEventPlayerStatsRecord.penaltyGoals,
          clears: proEventPlayerStatsRecord.clears,
          foulsCommitted: proEventPlayerStatsRecord.foulsCommitted,
          assists: proEventPlayerStatsRecord.assists,
          tackles: proEventPlayerStatsRecord.tackles,
          saves: proEventPlayerStatsRecord.saves,
          keyPasses: proEventPlayerStatsRecord.keyPasses,
          passesAttempted: proEventPlayerStatsRecord.passesAttempted,
          passesCompleted: proEventPlayerStatsRecord.passesCompleted,
          redCards: proEventPlayerStatsRecord.redCards,
          yellowCards: proEventPlayerStatsRecord.yellowCards,
          offsides: proEventPlayerStatsRecord.offsides,
          interceptions: proEventPlayerStatsRecord.interceptions,
          blocks: proEventPlayerStatsRecord.blocks,
          cleanSheets: 0,
          minutesPerProEvent: proEventPlayerStatsRecord.minutesPlayed,
          passCompletionPercentage:
            proEventPlayerStatsRecord.passesCompleted /
            proEventPlayerStatsRecord.passesAttempted *
            100,
        });
      }
    });

    it('should not aggregate data for non-overlapping fantasy events that include the same player', async () => {
      // Given a fantasyEvent that doesn't overlap time-wise
      const nonOverlappingFantasyEvent = await new MockFantasyEventBuilder()
        .withFantasyEventData({
          fantasyLeagueId: fantasyLeague.id,
          startDate: new Date(proEvent.startDate - 6 * DAY),
          endDate: new Date(proEvent.startDate - 3 * DAY),
        })
        .withParticipatingFantasyTeams(fantasyTeams)
        .buildAndPersist();

      await refreshFantasyEventPlayerStats(proEventPlayerStatsRecord);

      const nonOverlappingFantasyEventPlayerStatsRecords = await FantasyEventPlayerStats.find({
        fantasyEventId: nonOverlappingFantasyEvent.id,
        proPlayerId: proPlayers[0].id,
      });

      expect(nonOverlappingFantasyEventPlayerStatsRecords).to.have.lengthOf(0);
    });

    it('include data from other pro events', async () => {
      // Testing when the pro event is relevant to a fantasy event
      // which needs to total data from other pro events

      // Given an overlapping fantasy event
      const fantasyEvent = await new MockFantasyEventBuilder()
        .withFantasyEventData({
          fantasyLeagueId: fantasyLeague.id,
          startDate: new Date(proEvent.startDate - 3 * DAY),
          endDate: new Date(proEvent.startDate + 3 * DAY),
        })
        .withParticipatingFantasyTeams(fantasyTeams)
        .buildAndPersist();

      // Given 3 additional proEvents
      for (let i = 0; i < 3; i++) {
        const proEvent = await givenProEvent();
        await givenProEventPlayerStats({
          proEventId: proEvent.id,
          proPlayerId: proPlayers[0].id,
        });
        await refreshFantasyTeamPlayerProEventMeta(proEvent.id, proPlayers[0].id);
      }

      await refreshFantasyEventPlayerStats(proEventPlayerStatsRecord);

      const fantasyEventPlayerStatsRecord = await FantasyEventPlayerStats.findOne({
        where: {
          fantasyEventId: fantasyEvent.id,
          proPlayerId: proPlayers[0].id,
        },
      });

      expect(fantasyEventPlayerStatsRecord).to.include({
        minutesPlayed: proEventPlayerStatsRecord.minutesPlayed * 4,
        proEventsPlayed: 4,
        goals: proEventPlayerStatsRecord.goals * 4,
        ownGoals: proEventPlayerStatsRecord.ownGoals * 4,
        goalsAllowed: proEventPlayerStatsRecord.goalsAllowed * 4,
        penaltyShots: proEventPlayerStatsRecord.penaltyShots * 4,
        penaltyGoals: proEventPlayerStatsRecord.penaltyGoals * 4,
        clears: proEventPlayerStatsRecord.clears * 4,
        foulsCommitted: proEventPlayerStatsRecord.foulsCommitted * 4,
        assists: proEventPlayerStatsRecord.assists * 4,
        tackles: proEventPlayerStatsRecord.tackles * 4,
        saves: proEventPlayerStatsRecord.saves * 4,
        keyPasses: proEventPlayerStatsRecord.keyPasses * 4,
        passesAttempted: proEventPlayerStatsRecord.passesAttempted * 4,
        passesCompleted: proEventPlayerStatsRecord.passesCompleted * 4,
        redCards: proEventPlayerStatsRecord.redCards * 4,
        yellowCards: proEventPlayerStatsRecord.yellowCards * 4,
        offsides: proEventPlayerStatsRecord.offsides * 4,
        interceptions: proEventPlayerStatsRecord.interceptions * 4,
        blocks: proEventPlayerStatsRecord.blocks * 4,
        cleanSheets: 0,
        minutesPerProEvent: proEventPlayerStatsRecord.minutesPlayed, // Average is same as each pro event
        passCompletionPercentage:
          proEventPlayerStatsRecord.passesCompleted /
          proEventPlayerStatsRecord.passesAttempted *
          100,
      });
    });

    it('should ignore a benched player', async () => {
      // Given the pro player is benched
      FantasyTeamPlayerProEventMeta.updateAll({
        fantasyTeamId: fantasyTeams[0].id,
        proPlayerId: proPlayers[0].id,
        proEventId: proEvent.id,
      }, {
        position: null,
        positionOrder: null,
      });

      // Given an overlapping fantasy event
      const fantasyEvent = await new MockFantasyEventBuilder()
        .withFantasyEventData({
          fantasyLeagueId: fantasyLeague.id,
          startDate: new Date(proEvent.startDate - 3 * DAY),
          endDate: new Date(proEvent.startDate + 3 * DAY),
        })
        .withParticipatingFantasyTeams(fantasyTeams)
        .buildAndPersist();

      await refreshFantasyEventPlayerStats(proEventPlayerStatsRecord);

      const fantasyEventPlayerStatsRecords = await FantasyEventPlayerStats.find({
        fantasyEventId: fantasyEvent.id,
        proPlayerId: proPlayers[0].id,
      });

      expect(fantasyEventPlayerStatsRecords).to.have.lengthOf(0);
    });
  });
});
