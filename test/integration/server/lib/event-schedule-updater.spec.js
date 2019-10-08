'use strict';

const app = require('../../../../server/server');
const expect = require('../../../helpers/expect-preconfigured');
const moment = require('moment');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {
  givenStatsLeague,
  givenStatsEvent,
  givenStatsDate,
  givenMockedStatsApiKey,
  cleanupMockedStatsApiKey,
  givenMockedStatsEventEndpointWithEvents,
} = require('../../../helpers/stats-client.helpers');
const {givenProLeague} = require('../../../helpers/pro-league.helpers');
const {givenProEvent} = require('../../../helpers/pro-event.helpers');

const {
  ProLeague,
  ProEvent,
} = app.models;

const {updateEventSchedule} = require('../../../../server/lib/event-schedule-updater');

describe('integration: event-schedule-updater', () => {
  beforeEach(givenEmptyDatabase);

  before(givenMockedStatsApiKey);
  after(cleanupMockedStatsApiKey);

  describe('updateEventSchedule', () => {
    let proLeague;
    beforeEach('given a ProLeague', async () => {
      proLeague = await givenProLeague(givenStatsLeague().toProLeagueData());
    });

    it('should add new events to the database', async () => {
      const newStatsEvent = givenStatsEvent();
      givenMockedStatsEventEndpointWithEvents(proLeague.statsPath, [newStatsEvent]);

      const importedProEvents = await updateEventSchedule({app, proLeague});

      const expectedProEventData = newStatsEvent.toProEventData();
      expect(importedProEvents[0]).to.deep.include(expectedProEventData);
    });

    it('should update existing events with new data', async () => {
      const existingStatsEvent = givenStatsEvent({
        eventId: 10,
        startDate: [
          givenStatsDate({full: '2018-04-08T13:15:00.000'}),
        ],
      });
      const existingProEventData = existingStatsEvent.toProEventData();
      existingProEventData.proLeagueId = proLeague.id;
      const existingProEvent = await givenProEvent(existingProEventData);

      const newStatsEvent = givenStatsEvent({
        eventId: 10,
        startDate: [
          givenStatsDate({full: '2018-04-10T13:15:00.000'}),
        ],
      });

      givenMockedStatsEventEndpointWithEvents(proLeague.statsPath, [newStatsEvent]);

      const importedProEvents = await updateEventSchedule({app, proLeague});

      const expectedProEventData = newStatsEvent.toProEventData();
      expect(importedProEvents[0]).to.deep.include(expectedProEventData);
    });

    it('should flag any events missing from remote data', async () => {
      const existingStatsEvent = givenStatsEvent({
        eventId: 1,
        startDate: [
          givenStatsDate({full: '2018-04-08T13:15:00.000'}),
        ],
      });
      const existingProEventData = existingStatsEvent.toProEventData();
      existingProEventData.proLeagueId = proLeague.id;
      let existingProEvent = await givenProEvent(existingProEventData);

      const otherStatsEvent = givenStatsEvent({
        eventId: 2,
        startDate: [
          givenStatsDate({full: '2018-04-10T13:15:00.000'}),
        ],
      });

      givenMockedStatsEventEndpointWithEvents(proLeague.statsPath, [otherStatsEvent]);

      await updateEventSchedule({
        app,
        proLeague,
        startDate: moment('2018-04-01T00:00:00Z'),
        endDate: moment('2018-04-30T00:00:00Z'),
      });

      existingProEvent = await existingProEvent.reload();
      expect(existingProEvent.statsActive).to.be.false();
    });

    it('should associate events with a league', async () => {
      const statsEvent = givenStatsEvent();

      givenMockedStatsEventEndpointWithEvents(proLeague.statsPath, [statsEvent]);

      const importedProEvents = await updateEventSchedule({app, proLeague});

      const associatedLeague = await importedProEvents[0].proLeague.get();
      expect(associatedLeague).to.eql(proLeague);
    });

    it('should associate events with the winning team');
  });
});
