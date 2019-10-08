'use strict';

const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');

const app = require('../../../../server/server');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {givenLoggedInCustomer} = require('../../../helpers/customer.helpers');
const {
  givenFantasyLeagueData,
  givenFantasyLeague,
} = require('../../../helpers/fantasy-league.helpers');

const FantasyLeague = app.models.FantasyLeague;

describe('integration: FantasyLeague (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let customer, token;
  beforeEach('given logged in customer', async () => {
    ({customer, token} = await givenLoggedInCustomer());
  });

  it('should create a fantasy league', async () => {
    const fantasyLeagueData = givenFantasyLeagueData({
      currentPickNumber: null,
      ownerId: customer.id,
    });

    const response = await request(app)
      .post('/api/fantasy-leagues')
      .query({'access_token': token.id})
      .send(fantasyLeagueData);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(fantasyLeagueData);
  });

  it('should retrieve a fantasy league', async () => {
    const fantasyLeagueData = givenFantasyLeagueData({ownerId: customer.id});
    const fantasyLeague = await givenFantasyLeague(fantasyLeagueData);

    const response = await request(app)
      .get('/api/fantasy-leagues/' + fantasyLeague.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(fantasyLeagueData);
  });

  it('should update a fantasy league', async () => {
    const fantasyLeagueData = givenFantasyLeagueData({ownerId: customer.id});
    const fantasyLeague = await givenFantasyLeague(fantasyLeagueData);

    const modifiedFantasyLeagueData = Object.assign({}, fantasyLeagueData, {
      id: fantasyLeague.id,
      name: 'Modified Name',
    });

    const response = await request(app)
      .put('/api/fantasy-leagues/' + fantasyLeague.id)
      .send(modifiedFantasyLeagueData)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.include(modifiedFantasyLeagueData);
  });

  it('should delete a fantasy league', async () => {
    const fantasyLeague = await givenFantasyLeague({ownerId: customer.id});

    await request(app)
      .delete('/api/fantasy-leagues/' + fantasyLeague.id)
      .query({'access_token': token.id})
      .expect(200);

    const deletedFantasyLeague = await FantasyLeague.findById(fantasyLeague.id);
    expect(deletedFantasyLeague).to.equal(null);
  });
});
