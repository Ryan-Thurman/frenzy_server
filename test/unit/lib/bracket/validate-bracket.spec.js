'use strict';

const app = require('../../../../server/server');
const expect = require('../../../helpers/expect-preconfigured');
const {
  validateGroupsPicks,
  validateRoundPicks,
  validateLastRoundPicks,
} = require('../../../../server/lib/bracket/validate-bracket');
const {given8GroupsOfFourTeams} = require('../../../helpers/pro-team.helpers');
const {givenValidBracketData, givenBracketData} = require('../../../helpers/bracket.helpers');
const {flatten} = require('lodash');

const {Bracket} = app.models;

describe('ValidateBracket: unit', () => {
  let teams;
  beforeEach('given 32 pro teams', () => {
    teams = given8GroupsOfFourTeams().proTeams;
  });

  let bracket;
  beforeEach('given a bracket', () => {
    bracket = givenValidBracketData(teams);
  });

  describe('validateGroupsPicks', () => {
    it('should fail if picks are not set', () => {
      bracket.picks = null;

      const result = validateGroupsPicks(bracket, teams);
      expect(result.valid).to.be.false();
    });

    it('should fail if any group does not have 4 teams', () => {
      bracket.picks.groups.a = bracket.picks.groups.a.slice(1);

      const result = validateGroupsPicks(bracket, teams);
      expect(result.valid).to.be.false();
    });

    it('should fail if any team is missing from groups', () => {
      bracket.picks.groups.a[3] = 5000; // Made up team id

      const result = validateGroupsPicks(bracket, teams);
      expect(result.valid).to.be.false();
    });

    it('should fail if any team appears twice', () => {
      bracket.picks.groups.a[0] = bracket.picks.groups.a[1];

      const result = validateGroupsPicks(bracket, teams);
      expect(result.valid).to.be.false();
    });

    it('should fail if any team is in the wrong group', () => {
      const groupAWinner = bracket.picks.groups.a[0];
      const groupBWinner = bracket.picks.groups.b[0];
      bracket.picks.groups.a[0] = groupBWinner;
      bracket.picks.groups.b[0] = groupAWinner;

      const result = validateGroupsPicks(bracket, teams);
      expect(result.valid).to.be.false();
    });

    it('should succeed with a valid bracket', () => {
      const result = validateGroupsPicks(bracket, teams);
      expect(result.message).to.equal('Bracket is valid');
      expect(result.valid).to.be.true();
    });

    it('should success with an empty bracket', () => {
      bracket = new Bracket(givenBracketData());
      const result = validateGroupsPicks(bracket, teams);
      expect(result.message).to.equal('Bracket is valid');
      expect(result.valid).to.be.true();
    });
  });

  describe('validateRoundPicks', () => {
    it('should fail if any team is not present in validPicks', () => {
      // Inelligible team wins the tournament
      bracket.picks.quarterfinal.abcd = bracket.picks.groups.e[3];

      const result = validateRoundPicks('quarterfinal', bracket);
      expect(result.valid).to.be.false();
    });

    it('should succeed with a valid bracket', () => {
      const result = validateRoundPicks('quarterfinal', bracket);
      expect(result.message).to.equal('Bracket is valid');
      expect(result.valid).to.be.true();
    });

    it('should success with an empty bracket', () => {
      bracket = new Bracket(givenBracketData());
      const result = validateRoundPicks('quarterfinal', bracket);
      expect(result.message).to.equal('Bracket is valid');
      expect(result.valid).to.be.true();
    });
  });

  describe('validateLastRoundPicks', () => {
    it('should fail if any team is not present in validPicks', () => {
      // Inelligible team wins the tournament
      bracket.picks.final = bracket.picks.groups.a[3];

      const result = validateLastRoundPicks('final', bracket);
      expect(result.valid).to.be.false();
    });

    it('should succeed with a valid bracket', () => {
      const result = validateLastRoundPicks('final', bracket);
      expect(result.message).to.equal('Bracket is valid');
      expect(result.valid).to.be.true();
    });

    it('should success with an empty bracket', () => {
      bracket = new Bracket(givenBracketData());
      const result = validateLastRoundPicks('final', bracket);
      expect(result.message).to.equal('Bracket is valid');
      expect(result.valid).to.be.true();
    });
  });
});
