'use strict';

const {times} = require('lodash');
const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');

const app = require('../../../../server/server');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {
  givenFantasyTeamData,
  givenFantasyTeam,
} = require('../../../helpers/fantasy-team.helpers');
const {givenFantasyLeague} = require('../../../helpers/fantasy-league.helpers');
const {givenLoggedInCustomer} = require('../../../helpers/customer.helpers');

const FantasyTeam = app.models.FantasyTeam;

describe('integration: FantasyTeam (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let customer, token, fantasyLeague;
  beforeEach('given logged in customer and fantasy league', async () => {
    ({customer, token} = await givenLoggedInCustomer());
    fantasyLeague = await givenFantasyLeague({ownerId: customer.id});
  });

  it('should create a fantasy team', async () => {
    const fantasyTeamData = givenFantasyTeamData({
      ownerId: customer.id,
      fantasyLeagueId: fantasyLeague.id,
    });

    const response = await request(app)
      .post('/api/fantasy-teams')
      .query({'access_token': token.id})
      .send(fantasyTeamData);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(fantasyTeamData);
  });

  it('should retrieve a fantasy team', async () => {
    const fantasyTeamData = givenFantasyTeamData({
      ownerId: customer.id,
      fantasyLeagueId: fantasyLeague.id,
    });
    const fantasyTeam = await givenFantasyTeam(fantasyTeamData);

    const response = await request(app)
      .get('/api/fantasy-teams/' + fantasyTeam.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(fantasyTeamData);
  });

  it('should retrieve all teams for a given fantasy league', async () => {
    const fantasyTeamsData = times(3, i => givenFantasyTeamData({
      ownerId: customer.id,
      fantasyLeagueId: fantasyLeague.id,
      name: `Fantasy Team ${i}`,
    }));

    // Have to insert sequentially because although Model.create()
    // can take an array, the insertion order is not guaranteed.
    for (const fantasyTeamData of fantasyTeamsData) {
      await FantasyTeam.create(fantasyTeamData);
    }

    const response = await request(app)
      .get('/api/fantasy-teams/')
      .query({
        'access_token': token.id,
        filter: {where: {fantasyLeagueId: fantasyLeague.id}},
        order: 'id ASC',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    response.body.forEach((responseFantasyTeam, i) => {
      const originalFantasyTeam = fantasyTeamsData[i];
      expect(responseFantasyTeam).to.have.property('id').which.is.a('number');
      expect(responseFantasyTeam).to.deep.include(originalFantasyTeam);
    });
  });

  it('should update a fantasy team', async () => {
    const fantasyTeamData = givenFantasyTeamData({
      ownerId: customer.id,
      fantasyLeagueId: fantasyLeague.id,
    });
    const fantasyTeam = await givenFantasyTeam(fantasyTeamData);

    const modifiedFantasyTeamData = Object.assign({}, fantasyTeamData, {
      id: fantasyTeam.id,
      name: 'Modified Name',
    });

    const response = await request(app)
      .put('/api/fantasy-teams/' + fantasyTeam.id)
      .send(modifiedFantasyTeamData)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.include(modifiedFantasyTeamData);
  });

  it('should delete a fantasy team', async () => {
    const fantasyTeam = await givenFantasyTeam({
      ownerId: customer.id,
      fantasyLeagueId: fantasyLeague.id,
    });

    await request(app)
      .delete('/api/fantasy-teams/' + fantasyTeam.id)
      .query({'access_token': token.id})
      .expect(200);

    const deletedFantasyTeam = await FantasyTeam.findById(fantasyTeam.id);
    expect(deletedFantasyTeam).to.equal(null);
  });
});
