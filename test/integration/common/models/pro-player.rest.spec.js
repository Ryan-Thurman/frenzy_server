'use strict';

const {times} = require('lodash');
const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');

const app = require('../../../../server/server');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {givenLoggedInCustomer} = require('../../../helpers/customer.helpers');
const {
  givenProPlayerData,
  givenProPlayer,
} = require('../../../helpers/pro-player.helpers');
const {givenProLeague} = require('../../../helpers/pro-league.helpers');
const {givenProTeam} = require('../../../helpers/pro-team.helpers');

const ProPlayer = app.models.ProPlayer;

describe('integration: ProPlayer (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let token, proLeague, proTeam;
  beforeEach('given logged in customer, pro league, and pro team', async () => {
    ({token} = await givenLoggedInCustomer());
    proLeague = await givenProLeague();
    proTeam = await givenProTeam({proLeagueId: proLeague.id});
  });

  it('should retrieve a pro player', async () => {
    const proPlayerData = givenProPlayerData({
      proLeagueId: proLeague.id,
      proTeamId: proTeam.id,
    });
    const proPlayer = await givenProPlayer(proPlayerData);

    const response = await request(app)
      .get('/api/pro-players/' + proPlayer.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(proPlayerData);
  });

  it('should retrieve all pro players for a given pro league', async () => {
    const proPlayersData = times(3, i => givenProPlayerData({
      proLeagueId: proLeague.id,
      proTeamId: proTeam.id,
      name: `Pro Player ${i}`,
    }));

    // Have to insert sequentially because although Model.create()
    // can take an array, the insertion order is not guaranteed.
    for (const proPlayerData of proPlayersData) {
      await ProPlayer.create(proPlayerData);
    }

    const response = await request(app)
      .get('/api/pro-players/')
      .query({
        'access_token': token.id,
        filter: {where: {proLeagueId: proLeague.id}},
        order: 'id ASC',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    response.body.forEach((responseProPlayer, i) => {
      const originalProPlayer = proPlayersData[i];
      expect(responseProPlayer).to.have.property('id').which.is.a('number');
      expect(responseProPlayer).to.deep.include(originalProPlayer);
    });
  });

  it('should retrieve all pro players for a given pro team', async () => {
    const proPlayersData = times(3, i => givenProPlayerData({
      proLeagueId: proLeague.id,
      proTeamId: proTeam.id,
      name: `Pro Player ${i}`,
    }));

    // Have to insert sequentially because although Model.create()
    // can take an array, the insertion order is not guaranteed.
    for (const proPlayerData of proPlayersData) {
      await ProPlayer.create(proPlayerData);
    }

    const response = await request(app)
      .get('/api/pro-players/')
      .query({
        'access_token': token.id,
        filter: {where: {proTeamId: proTeam.id}},
        order: 'id ASC',
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
    response.body.forEach((responseProPlayer, i) => {
      const originalProPlayer = proPlayersData[i];
      expect(responseProPlayer).to.have.property('id').which.is.a('number');
      expect(responseProPlayer).to.deep.include(originalProPlayer);
    });
  });
});
