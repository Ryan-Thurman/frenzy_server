'use strict';

const app = require('../../../../server/server');
const expect = require('../../../helpers/expect-preconfigured');
const moment = require('moment');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {
  givenStatsLeague,
  MockStatsEventBuilder,
  givenStatsDate,
  givenMockedStatsApiKey,
  cleanupMockedStatsApiKey,
  givenMockedStatsEventEndpointWithBoxEvent,
} = require('../../../helpers/stats-client.helpers');
const {givenProLeague} = require('../../../helpers/pro-league.helpers');
const {givenProEvent} = require('../../../helpers/pro-event.helpers');
const {MockProTeamBuilder} = require('../../../helpers/pro-team.helpers');

const {pollEventBoxScores} = require('../../../../server/lib/live-event-box-scores-updater');

describe('integration: live-event-box-scores-updater', () => {
  beforeEach(givenEmptyDatabase);

  before(givenMockedStatsApiKey);
  after(cleanupMockedStatsApiKey);

  let proTeams, proPlayers;
  beforeEach('given pro teams and players', async () => {
    proTeams = [];
    proPlayers = [];
    for (let i = 0; i < 2; i++) {
      const {proTeam, proPlayers: proTeamPlayers} = await (new MockProTeamBuilder()
        .withProTeamData({
          name: 'Test Pro Team ' + i,
          statsId: 100 + i,
        })
        .withNProPlayers(16)
        .buildAndPersist());

      proTeams.push(proTeam);
      proPlayers = proPlayers.concat(proTeamPlayers);
    }
  });

  describe('pollEventBoxScores', () => {
    let proLeague;
    beforeEach('given a ProLeague', async () => {
      proLeague = await givenProLeague(givenStatsLeague().toProLeagueData());
    });

    it('should populate the database with updated box scores for events in progress', async () => {
      const now = '2018-05-10T00:02:31.430Z';
      // Event started 15 minutes ago
      const startDate = moment(now).subtract(15, 'minutes').toISOString();

      await givenProEvent({
        proLeagueId: proLeague.id,
        startDate: startDate,
        boxDataConfirmed: false,
        statsId: 10,
      });

      const newStatsEvent = new MockStatsEventBuilder()
        .withStatsEventData({
          eventId: 10,
          startDate: [
            givenStatsDate({full: startDate}),
          ],
        })
        .containingProPlayers(proPlayers)
        .withProTeams(proTeams)
        .build();

      givenMockedStatsEventEndpointWithBoxEvent(proLeague.statsPath, newStatsEvent);

      const importedProEvents = await pollEventBoxScores(app, now);

      const expectedProEventData = newStatsEvent.toProEventData();
      expect(importedProEvents[0]).to.deep.include(expectedProEventData);
    });

    it('should ignore events that haven\'t started yet', async () => {
      const now = '2018-05-10T00:02:31.430Z';
      // Event starts in 15 minutes
      const startDate = moment(now).add(15, 'minutes').toISOString();

      await givenProEvent({
        proLeagueId: proLeague.id,
        startDate: startDate,
        boxDataConfirmed: false,
        statsId: 10,
      });

      const importedProEvents = await pollEventBoxScores(app, now);
      expect(importedProEvents).to.be.empty();
    });

    it('should ignore events with finalized box scores', async () => {
      const now = '2018-05-10T00:02:31.430Z';
      // Event was yesterday
      const startDate = moment(now).add(1, 'day').toISOString();

      await givenProEvent({
        proLeagueId: proLeague.id,
        startDate: startDate,
        boxDataConfirmed: true,
        statsId: 10,
      });

      const importedProEvents = await pollEventBoxScores(app, now);
      expect(importedProEvents).to.be.empty();
    });

    it('should not crash with no second argument', async () => {
      const importedProEvents = await pollEventBoxScores(app);
      expect(importedProEvents).to.be.empty();
    });
  });
});
