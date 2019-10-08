'use strict';

const request = require('supertest');
const expect = require('../../../../helpers/expect-preconfigured');

const app = require('../../../../../server/server');

const {givenEmptyDatabase} = require('../../../../helpers/database.helpers');
const {givenLoggedInCustomer} = require('../../../../helpers/customer.helpers');
const {givenProLeague} = require('../../../../helpers/pro-league.helpers');
const {MockProTeamBuilder} = require('../../../../helpers/pro-team.helpers');
const {MockFantasyLeagueBuilder} = require('../../../../helpers/fantasy-league.helpers');
const {givenDraftEvent} = require('../../../../helpers/draft-event.helpers');

const {Draft} = app.models;

describe('integration: Draft (rest)', () => {
  beforeEach(givenEmptyDatabase);

  let customer, token, proLeague, proPlayers, fantasyLeague, fantasyTeams;
  beforeEach('given mock data', async () => {
    ({customer, token} = await givenLoggedInCustomer());
    proLeague = await givenProLeague();
    ({proPlayers} = await new MockProTeamBuilder()
      .withProTeamData({proLeagueId: proLeague.id})
      .withNProPlayers(5)
      .buildAndPersist());
    ({fantasyLeague, fantasyTeams} = await new MockFantasyLeagueBuilder()
      .withFantasyLeagueData({
        ownerId: customer.id,
        currentPickEndsAt: new Date(),
      })
      .allowingProLeagues([proLeague])
      .withNFantasyTeams(1)
      .andTeamOwners([customer])
      .containingProPlayers(proPlayers.slice(0, 3))
      .buildAndPersist());
  });

  it('should retrieve a draft with league, teams, assigned players, and available players', async () => {
    // Build expected response
    const draft = await Draft.createFromFantasyLeague(fantasyLeague);
    const expectedDraft = draft.toJSON();

    // Attach team data
    fantasyTeams[0] = await fantasyTeams[0].reload({
      include: [{
        fantasyTeamPlayers: ['proPlayer'],
      }],
    });
    const expectedTeam = fantasyTeams[0].toJSON();
    expectedDraft.teams = [expectedTeam];

    // Apparently toJSON() doesn't convert dates to strings
    for (const field of ['createdAt', 'updatedAt']) {
      expectedTeam[field] = expectedTeam[field].toISOString();
    }
    for (const ftPlayer of expectedTeam.fantasyTeamPlayers) {
      for (const field of ['createdAt', 'updatedAt']) {
        ftPlayer.proPlayer[field] = ftPlayer.proPlayer[field].toISOString();
      }
    }
    expectedDraft.currentPickEndsAt = expectedDraft.currentPickEndsAt.toISOString();

    // Perform request
    const response = await request(app)
      .get(`/api/fantasy-leagues/${fantasyLeague.id}/draft`)
      .query({'access_token': token.id});

    expect(response.status).to.equal(200);
    const responseDraft = response.body;
    expect(responseDraft).to.deep.include(expectedDraft);

    // available players
    const availablePlayers = responseDraft.availablePlayers;
    expect(availablePlayers).to.have.lengthOf(2);
  });

  it('should include the most recent draft event ID', async () => {
    const draftEvent = await givenDraftEvent({
      fantasyLeagueId: fantasyLeague.id,
      eventName: 'dummy',
    });

    // Perform request
    const response = await request(app)
      .get(`/api/fantasy-leagues/${fantasyLeague.id}/draft`)
      .query({'access_token': token.id});

    expect(response.body.lastEventId).to.eql(draftEvent.id);
  });
});
