'use strict';

const {times} = require('lodash');
const request = require('supertest');
const expect = require('../../../../helpers/expect-preconfigured');

const app = require('../../../../../server/server');

const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {givenLoggedInCustomer} = require('../../../../helpers/customer.helpers');
const {
  givenProEventData,
  givenProEvent,
} = require('../../../../helpers/pro-event.helpers');
const {givenProLeague} = require('../../../../helpers/pro-league.helpers');

const ProEvent = app.models.ProEvent;

describe('integration: ProEvent (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let token, proLeague;
  beforeEach('given logged in customer and pro league', async () => {
    ({token} = await givenLoggedInCustomer());
    proLeague = await givenProLeague();
  });

  it('should retrieve a pro event', async () => {
    const proEventData = givenProEventData({proLeagueId: proLeague.id});
    const proEvent = await givenProEvent(proEventData);

    const response = await request(app)
      .get('/api/pro-events/' + proEvent.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    response.body.startDate = new Date(response.body.startDate);
    expect(response.body).to.deep.include(proEventData);
  });

  it('should retrieve all pro events for a given pro league', async () => {
    const proEventsData = times(3, i => givenProEventData({
      proLeagueId: proLeague.id,
    }));

    // Have to insert sequentially because although Model.create()
    // can take an array, the insertion order is not guaranteed.
    for (const proEventData of proEventsData) {
      await ProEvent.create(proEventData);
    }

    const response = await request(app)
      .get('/api/pro-events/')
      .query({
        'access_token': token.id,
        filter: {where: {proLeagueId: proLeague.id}},
        order: 'id ASC',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    response.body.forEach((responseProEvent, i) => {
      const originalProEvent = proEventsData[i];
      expect(responseProEvent).to.have.property('id').which.is.a('number');
      responseProEvent.startDate = new Date(responseProEvent.startDate);
      expect(responseProEvent).to.deep.include(originalProEvent);
    });
  });
});
