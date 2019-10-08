'use strict';

const {times, flatten} = require('lodash');
const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');

const app = require('../../../../server/server');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {
  givenBracketData,
  givenValidBracketData,
  givenBracket,
} = require('../../../helpers/bracket.helpers');
const {
  givenLoggedInCustomer,
  givenCustomer,
} = require('../../../helpers/customer.helpers');
const {
  given8GroupsOfFourTeams,
  givenProTeams,
} = require('../../../helpers/pro-team.helpers');
const {
  givenProLeague,
} = require('../../../helpers/pro-league.helpers');

const {Bracket} = app.models;

describe('integration: Bracket (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let customer, token;
  beforeEach('given logged in customer', async () => {
    ({customer, token} = await givenLoggedInCustomer());
  });

  it('should create a bracket', async () => {
    const bracketData = givenBracketData({ownerId: customer.id});

    const response = await request(app)
      .post('/api/brackets')
      .query({'access_token': token.id})
      .send(bracketData);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(bracketData);
  });

  it('should retrieve a bracket', async () => {
    const bracketData = givenBracketData({ownerId: customer.id});
    const bracket = await givenBracket(bracketData);

    const response = await request(app)
      .get('/api/brackets/' + bracket.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('id').which.is.a('number');
    expect(response.body).to.deep.include(bracketData);
  });

  it('should update a bracket', async () => {
    const bracketData = givenBracketData({ownerId: customer.id});
    const bracket = await givenBracket(bracketData);

    const modifiedBracketData = Object.assign({}, bracketData, {
      id: bracket.id,
      submitted: true,
    });

    const response = await request(app)
      .put('/api/brackets/' + bracket.id)
      .send(modifiedBracketData)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.include(modifiedBracketData);
  });

  it.skip('should not allow a bracket to be modified after it is submitted', async () => {
    const bracketData = givenBracketData({
      ownerId: customer.id,
      submitted: true,
    });
    let bracket = await givenBracket(bracketData);

    const modifiedBracketData = Object.assign({}, bracketData, {
      id: bracket.id,
      picks: {
        final: {
          proTeamId: null,
          name: null,
        },
      },
    });

    const response = await request(app)
      .put('/api/brackets/' + bracket.id)
      .send(modifiedBracketData)
      .query({'access_token': token.id});

    expect(response.status).to.equal(403);

    bracket = await bracket.reload();
    expect(bracket.toObject())
      .to.deep.include(bracketData)
      .and.not.to.deep.include(modifiedBracketData);
  });

  it('should not allow a user to modify someone else\'s bracket', async () => {
    const otherCustomer = await givenCustomer({email: 'other@example.com', username: 'other'});
    const bracketData = givenBracketData({
      ownerId: otherCustomer.id,
      submitted: true,
    });
    let bracket = await givenBracket(bracketData);

    const modifiedBracketData = Object.assign({}, bracketData, {
      id: bracket.id,
      picks: {
        final: {
          proTeamId: null,
          name: null,
        },
      },
    });

    const response = await request(app)
      .put('/api/brackets/' + bracket.id)
      .send(modifiedBracketData)
      .query({'access_token': token.id});

    expect(response.status).to.equal(401);

    bracket = await bracket.reload();
    expect(bracket.toObject())
      .to.deep.include(bracketData)
      .and.not.to.deep.include(modifiedBracketData);
  });

  it('should populate validPicks', async () => {
    // Generate some teams
    const proLeague = await givenProLeague({statsPath: 'natl'});
    let {proTeams} = given8GroupsOfFourTeams({proLeagueId: proLeague.id});
    for (const proTeam of proTeams) { proTeam.unsetAttribute('id'); }
    proTeams = await givenProTeams(proTeams);

    // Make some valid picks for groups
    const bracketData = givenBracketData({ownerId: customer.id});
    const validBracketData = givenValidBracketData(proTeams);
    bracketData.picks.groups = validBracketData.picks.groups;

    const response = await request(app)
      .post('/api/brackets')
      .query({'access_token': token.id})
      .send(bracketData);

    expect(response.status).to.equal(200);
    expect(response.body).to.have.nested.property('validPicks.roundOf16').which.is.an('object');
    const validRoundOf16Picks = flatten(Object.values(response.body.validPicks.roundOf16));
    expect(validRoundOf16Picks).to.have.lengthOf(16);
    for (const validPick of validRoundOf16Picks) {
      expect(validPick).to.have.property('proTeamId').which.is.a('number');
      expect(validPick).have.property('name').which.is.a('string');
    }
  });

  it('should ignore client-side changes to validPicks', async () => {
    // Generate some teams
    const proLeague = await givenProLeague({statsPath: 'natl'});
    let {proTeams} = given8GroupsOfFourTeams({proLeagueId: proLeague.id});
    for (const proTeam of proTeams) { proTeam.unsetAttribute('id'); }
    proTeams = await givenProTeams(proTeams);

    // Make some valid picks for groups
    const bracket = await givenValidBracketData(proTeams, {ownerId: customer.id}).save();
    const bracketData = bracket.toObject();
    delete bracketData.createdAt;
    delete bracketData.updatedAt;

    const modifiedBracketData = Object.assign({}, bracketData, {
      validPicks: {
        final: [{
          proTeamId: null,
          name: null,
        }],
      },
    });

    const response = await request(app)
      .put('/api/brackets/' + bracket.id)
      .send(modifiedBracketData)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body)
      .to.deep.include(bracketData)
      .and.not.to.deep.include(modifiedBracketData);
  });

  it('should not allow a user to modify points fields', async () => {
    const bracketData = givenBracketData({
      ownerId: customer.id,
      submitted: true,
    });
    let bracket = await givenBracket(bracketData);

    const modifiedBracketData = Object.assign({}, bracketData, {
      id: bracket.id,
      earnedPoints: 100,
      totalPotentialPoints: 150,
    });

    const response = await request(app)
      .put('/api/brackets/' + bracket.id)
      .send(modifiedBracketData)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);

    bracket = await bracket.reload();
    expect(bracket.toObject())
      .to.deep.include(bracketData)
      .and.not.to.deep.include(modifiedBracketData);
  });

  it('should delete a bracket', async () => {
    const bracket = await givenBracket({ownerId: customer.id});

    await request(app)
      .delete('/api/brackets/' + bracket.id)
      .query({'access_token': token.id})
      .expect(200);

    const deletedBracket = await Bracket.findById(bracket.id);
    expect(deletedBracket).to.equal(null);
  });

  describe('validation', () => {
    it('should fill in any missing schema', async () => {
      const sparseBracketData = {ownerId: customer.id};

      const response = await request(app)
        .post('/api/brackets')
        .query({'access_token': token.id})
        .send(sparseBracketData);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.nested.property('picks.groups.a').which.is.an('array');
      expect(response.body).to.deep.include(sparseBracketData);
    });

    it('should reject a bracket with an incorrect schema', async () => {
      const sparseBracketData = {
        ownerId: customer.id,
        picks: {
          groups: {a: 'should be an array'},
        },
      };

      const response = await request(app)
        .post('/api/brackets')
        .query({'access_token': token.id})
        .send(sparseBracketData);

      expect(response.status).to.equal(400);
    });
  });
});
