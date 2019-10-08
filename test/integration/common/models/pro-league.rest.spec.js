'use strict';

const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');

const app = require('../../../../server/server');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {givenLoggedInCustomer} = require('../../../helpers/customer.helpers');
const {
  givenProLeagueData,
  givenProLeague,
} = require('../../../helpers/pro-league.helpers');

const ProLeague = app.models.ProLeague;

describe('integration: ProLeague (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let token;
  beforeEach('given logged in customer', async () => {
    ({token} = await givenLoggedInCustomer());
  });

  it('should retrieve a pro league', async () => {
    const proLeagueData = givenProLeagueData();
    const proLeague = await givenProLeague(proLeagueData);

    const response = await request(app)
      .get('/api/pro-leagues/' + proLeague.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(proLeagueData);
  });
});
