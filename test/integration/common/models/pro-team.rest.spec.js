'use strict';

const {times} = require('lodash');
const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');

const app = require('../../../../server/server');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {givenLoggedInCustomer} = require('../../../helpers/customer.helpers');
const {
  givenProTeamData,
  givenProTeam,
} = require('../../../helpers/pro-team.helpers');
const {givenProLeague} = require('../../../helpers/pro-league.helpers');

const ProTeam = app.models.ProTeam;

describe('integration: ProTeam (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let token, proLeague;
  beforeEach('given logged in customer and pro league', async () => {
    ({token} = await givenLoggedInCustomer());
    proLeague = await givenProLeague();
  });

  it('should retrieve a pro team', async () => {
    const proTeamData = givenProTeamData({proLeagueId: proLeague.id});
    const proTeam = await givenProTeam(proTeamData);

    const response = await request(app)
      .get('/api/pro-teams/' + proTeam.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(proTeamData);
  });

  it('should retrieve all pro teams for a given pro league', async () => {
    const proTeamsData = times(3, i => givenProTeamData({
      proLeagueId: proLeague.id,
      name: `Pro Team ${i}`,
    }));

    // Have to insert sequentially because although Model.create()
    // can take an array, the insertion order is not guaranteed.
    for (const proTeamData of proTeamsData) {
      await ProTeam.create(proTeamData);
    }

    const response = await request(app)
      .get('/api/pro-teams/')
      .query({
        'access_token': token.id,
        filter: {where: {proLeagueId: proLeague.id}},
        order: 'id ASC',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    response.body.forEach((responseProTeam, i) => {
      const originalProTeam = proTeamsData[i];
      expect(responseProTeam).to.have.property('id').which.is.a('number');
      expect(responseProTeam).to.deep.include(originalProTeam);
    });
  });
});
