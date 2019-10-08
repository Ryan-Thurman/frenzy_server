'use strict';

const expect = require('../../helpers/expect-preconfigured');
const SnakeDraft = require('../../../server/lib/fantasy-league/draft/snake-draft');

describe('SnakeDraft: unit', () => {
  describe('getTeamForPickNumber', () => {
    it('should correctly order 4 teams', () => {
      const TEAM_1 = {}, TEAM_2 = {}, TEAM_3 = {}, TEAM_4 = {};
      const teams = [TEAM_1, TEAM_2, TEAM_3, TEAM_4];
      expect(SnakeDraft.getTeamForPickNumber(1, teams)).to.equal(TEAM_1);
      expect(SnakeDraft.getTeamForPickNumber(2, teams)).to.equal(TEAM_2);
      expect(SnakeDraft.getTeamForPickNumber(3, teams)).to.equal(TEAM_3);
      expect(SnakeDraft.getTeamForPickNumber(4, teams)).to.equal(TEAM_4);
      expect(SnakeDraft.getTeamForPickNumber(5, teams)).to.equal(TEAM_4);
      expect(SnakeDraft.getTeamForPickNumber(6, teams)).to.equal(TEAM_3);
      expect(SnakeDraft.getTeamForPickNumber(7, teams)).to.equal(TEAM_2);
      expect(SnakeDraft.getTeamForPickNumber(8, teams)).to.equal(TEAM_1);
      expect(SnakeDraft.getTeamForPickNumber(9, teams)).to.equal(TEAM_1);
      expect(SnakeDraft.getTeamForPickNumber(10, teams)).to.equal(TEAM_2);
      expect(SnakeDraft.getTeamForPickNumber(11, teams)).to.equal(TEAM_3);
      expect(SnakeDraft.getTeamForPickNumber(12, teams)).to.equal(TEAM_4);
    });
  });
});
