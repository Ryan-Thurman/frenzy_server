'use strict';

const request = require('supertest');
const expect = require('../../../helpers/expect-preconfigured');

const app = require('../../../../server/server');

const {givenEmptyDatabase} = require('../../../helpers/database.helpers');
const {
  givenFantasyTeamData,
  givenFantasyTeam,
} = require('../../../helpers/fantasy-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../helpers/fantasy-league.helpers');
const {givenLoggedInCustomer} = require('../../../helpers/customer.helpers');

const Lineup = app.models.Lineup;

describe('integration: Lineup (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let customer, token;
  beforeEach('given logged in customer and fantasy league', async () => {
    ({customer, token} = await givenLoggedInCustomer());
  });

  it('should retrieve a lineup by ID', async () => {
    const lineupData = (await Lineup.findOne()).toJSON();

    const response = await request(app)
      .get('/api/lineups/' + lineupData.id)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.include(lineupData);
  });

  it('should retrieve all lineups', async () => {
    const lineups = await Lineup.find();
    const lineupsData = lineups.map(lineup => lineup.toJSON());

    const response = await request(app)
      .get('/api/lineups')
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal(lineupsData);
  });

  it('should include a lineup with a fantasy team', async () => {
    const lineupData = (await Lineup.findOne()).toJSON();
    const {fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({ownerId: customer.id})
      .withFantasyTeams([{
        lineupId: lineupData.id,
        lineup: lineupData,
      }])
      .andTeamOwners([customer])
      .buildAndPersist();

    const expectedFantasyTeamData = fantasyTeams[0].toJSON();
    expectedFantasyTeamData.lineup = lineupData;
    expectedFantasyTeamData.createdAt = expectedFantasyTeamData.createdAt.toJSON();
    expectedFantasyTeamData.updatedAt = expectedFantasyTeamData.updatedAt.toJSON();

    const response = await request(app)
      .get('/api/fantasy-teams/' + fantasyTeams[0].id)
      .query({
        filter: {include: 'lineup'},
        'access_token': token.id,
      });

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.include(expectedFantasyTeamData);
  });
});
