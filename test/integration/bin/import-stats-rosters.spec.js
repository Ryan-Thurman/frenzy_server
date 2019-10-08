'use strict';

const app = require('../../../server/server');
const expect = require('../../helpers/expect-preconfigured');

const {givenEmptyDatabase} = require('../../helpers/database.helpers');
const {
  givenStatsLeague,
  givenStatsTeam,
  givenStatsPlayer,
  givenMockedStatsLeagueEndpointWithLeagues,
  givenMockedStatsTeamEndpointWithTeams,
  givenMockedStatsTeamEndpointFailure,
  givenMockedStatsPlayerEndpointWithPlayers,
  givenMockedStatsApiKey,
  cleanupMockedStatsApiKey,
} = require('../../helpers/stats-client.helpers');
const {givenProLeague} = require('../../helpers/pro-league.helpers');
const {givenProTeam} = require('../../helpers/pro-team.helpers');
const {givenProPlayer} = require('../../helpers/pro-player.helpers');

const {
  ProLeague,
  ProTeam,
  ProPlayer,
} = app.models;

const {doStatsImport} = require('../../../server/lib/stats-roster-importer');
const importLeagues = require('../../../server/lib/stats-roster-importer/import-leagues');
const importTeams = require('../../../server/lib/stats-roster-importer/import-teams');
const importPlayers = require('../../../server/lib/stats-roster-importer/import-players');

describe('integration: import-stats-rosters', () => {
  beforeEach(givenEmptyDatabase);

  before(givenMockedStatsApiKey);
  after(cleanupMockedStatsApiKey);

  describe('importLeagues', () => {
    it('should add new leagues to the database', async () => {
      const newStatsLeague = givenStatsLeague();

      givenMockedStatsLeagueEndpointWithLeagues([newStatsLeague]);

      const importedProLeagues = await importLeagues(app);

      const expectedProLeagueData = newStatsLeague.toProLeagueData();
      expect(importedProLeagues[0]).to.deep.include(expectedProLeagueData);
    });

    it('should update existing leagues with new data', async () => {
      const existingStatsLeague = givenStatsLeague({
        leagueId: 1,
        displayName: 'Old Name',
        uriPaths: [{pathSequence: 1, path: 'abc'}],
      });
      const existingProLeague = await givenProLeague(existingStatsLeague.toProLeagueData());

      const newStatsLeague = givenStatsLeague({
        leagueId: 1,
        displayName: 'New Name',
        uriPaths: [{pathSequence: 1, path: 'abc'}],
      });

      givenMockedStatsLeagueEndpointWithLeagues([newStatsLeague]);

      const importedProLeagues = await importLeagues(app);

      const expectedProLeagueData = newStatsLeague.toProLeagueData();
      expect(importedProLeagues[0]).to.deep.include(expectedProLeagueData);
    });

    it('should only import leagues on the whitelist', async () => {
      const whitelistedStatsLeague = givenStatsLeague({
        leagueId: 1,
        displayName: 'Whitelisted League',
        uriPaths: [{pathSequence: 1, path: 'abc'}],
      });
      const otherStatsLeague = givenStatsLeague({
        leagueId: 2,
        displayName: 'Other League',
        uriPaths: [{pathSequence: 1, path: 'def'}],
      });

      givenMockedStatsLeagueEndpointWithLeagues([
        whitelistedStatsLeague,
        otherStatsLeague,
      ]);

      const whitelist = ['abc'];
      const importedProLeagues = await importLeagues(app, whitelist);
      const expectedProLeaguesData = whitelistedStatsLeague.toProLeagueData();
      expect(importedProLeagues[0]).to.deep.include(expectedProLeaguesData);
      for (const league of importedProLeagues) {
        expect(league).not.to.deep.include(otherStatsLeague.toProLeagueData());
      }
    });

    it('should flag any leagues missing from remote data', async () => {
      const existingStatsLeague = givenStatsLeague({
        leagueId: 1,
        displayName: 'Old Name',
        uriPaths: [{pathSequence: 1, path: 'abc'}],
      });
      let existingProLeague = await givenProLeague(existingStatsLeague.toProLeagueData());
      const otherStatsLeague = givenStatsLeague({
        leagueId: 2,
        displayName: 'Other League',
        uriPaths: [{pathSequence: 1, path: 'def'}],
      });

      givenMockedStatsLeagueEndpointWithLeagues([otherStatsLeague]);

      await importLeagues(app);

      existingProLeague = await existingProLeague.reload();
      expect(existingProLeague.statsActive).to.be.false();
    });
  });

  describe('importTeams', () => {
    let proLeague;
    beforeEach('given a ProLeague', async () => {
      proLeague = await givenProLeague(givenStatsLeague().toProLeagueData());
    });

    it('should add new teams to the database', async () => {
      const newStatsTeam = givenStatsTeam();
      givenMockedStatsTeamEndpointWithTeams(proLeague.statsPath, [newStatsTeam]);

      const importedProTeams = await importTeams(app, [proLeague]);

      const expectedProTeamData = newStatsTeam.toProTeamData();
      expect(importedProTeams[0]).to.deep.include(expectedProTeamData);
    });

    it('should update existing teams with new data', async () => {
      const existingStatsTeam = givenStatsTeam({
        teamId: 10,
        displayName: 'Old Name',
      });
      const existingProTeam = await givenProTeam(existingStatsTeam.toProTeamData());

      const newStatsTeam = givenStatsTeam({
        teamId: 10,
        displayName: 'New Name',
      });

      givenMockedStatsTeamEndpointWithTeams(proLeague.statsPath, [newStatsTeam]);

      const importedProTeams = await importTeams(app, [proLeague]);

      const expectedProTeamData = newStatsTeam.toProTeamData();
      expect(importedProTeams[0]).to.deep.include(expectedProTeamData);
    });

    it('should flag any teams missing from remote data', async () => {
      const existingStatsTeam = givenStatsTeam({
        teamId: 1,
        displayName: 'Old Name',
      });
      let existingProTeam = await givenProTeam(existingStatsTeam.toProTeamData());
      const otherStatsTeam = givenStatsTeam({
        teamId: 2,
        displayName: 'Other Team',
      });
      givenMockedStatsTeamEndpointWithTeams(proLeague.statsPath, [otherStatsTeam]);

      await importTeams(app, [proLeague]);

      existingProTeam = await existingProTeam.reload();
      expect(existingProTeam.statsActive).to.be.false();
    });

    it('should associate teams with a league', async () => {
      const statsTeam = givenStatsTeam();

      givenMockedStatsTeamEndpointWithTeams(proLeague.statsPath, [statsTeam]);

      const importedProTeams = await importTeams(app, [proLeague]);

      const associatedLeague = await importedProTeams[0].proLeague.get();
      expect(associatedLeague).to.eql(proLeague);
    });
  });

  describe('importPlayers', () => {
    let proLeague, proTeam;
    beforeEach('given an associated ProTeam and ProLeague', async () => {
      proLeague = await givenProLeague(givenStatsLeague().toProLeagueData());
      const proTeamData = givenStatsTeam().toProTeamData();
      proTeamData.proLeagueId = proLeague.id;
      proTeam = await givenProTeam(proTeamData);
    });

    it('should add new players to the database', async () => {
      const newStatsPlayer = givenStatsPlayer();
      givenMockedStatsPlayerEndpointWithPlayers(proLeague.statsPath, [newStatsPlayer]);

      const importedProPlayers = await importPlayers(app, [proLeague]);

      const expectedProPlayerData = newStatsPlayer.toProPlayerData();
      expect(importedProPlayers[0]).to.deep.include(expectedProPlayerData);
    });

    it('should update existing players with new data', async () => {
      const existingStatsPlayer = givenStatsPlayer({
        playerId: 10,
        displayName: 'Old Name',
      });
      const existingProPlayer = await givenProPlayer(existingStatsPlayer.toProPlayerData());

      const newStatsPlayer = givenStatsPlayer({
        playerId: 10,
        displayName: 'New Name',
      });

      givenMockedStatsPlayerEndpointWithPlayers(proLeague.statsPath, [newStatsPlayer]);

      const importedProPlayers = await importPlayers(app, [proLeague]);

      const expectedProPlayerData = newStatsPlayer.toProPlayerData();
      expect(importedProPlayers[0]).to.deep.include(expectedProPlayerData);
    });

    it('should flag any players missing from remote data', async () => {
      const existingStatsPlayer = givenStatsPlayer({
        playerId: 1,
        displayName: 'Old Name',
      });
      let existingProPlayer = await givenProPlayer(existingStatsPlayer.toProPlayerData());
      const otherStatsPlayer = givenStatsPlayer({
        playerId: 2,
        displayName: 'Other Player',
      });
      givenMockedStatsPlayerEndpointWithPlayers(proLeague.statsPath, [otherStatsPlayer]);

      await importPlayers(app, [proLeague]);

      existingProPlayer = await existingProPlayer.reload();
      expect(existingProPlayer.statsActive).to.be.false();
    });

    it('should associate players with a team', async () => {
      const statsPlayer = givenStatsPlayer();

      givenMockedStatsPlayerEndpointWithPlayers(proLeague.statsPath, [statsPlayer]);

      const importedProPlayers = await importPlayers(app, [proLeague]);

      const associatedTeam = await importedProPlayers[0].proTeam.get();
      expect(associatedTeam.toJSON()).to.eql(proTeam.toJSON());
    });

    it('should associate players with a league', async () => {
      const statsPlayer = givenStatsPlayer();

      givenMockedStatsPlayerEndpointWithPlayers(proLeague.statsPath, [statsPlayer]);

      const importedProPlayers = await importPlayers(app, [proLeague]);

      const associatedLeague = await importedProPlayers[0].proLeague.get();
      expect(associatedLeague).to.eql(proLeague);
    });
  });

  describe('doStatsImport', () => {
    it('should rollback if any step of the import fails', async () => {
      givenMockedStatsLeagueEndpointWithLeagues([givenStatsLeague()]);
      givenMockedStatsTeamEndpointFailure();

      try {
        await doStatsImport(app);
      } catch (e) {}

      const leagues = await ProLeague.find();
      expect(leagues).to.be.empty();

      const teams = await ProTeam.find();
      expect(teams).to.be.empty();

      const players = await ProPlayer.find();
      expect(players).to.be.empty();
    });
  });
});
