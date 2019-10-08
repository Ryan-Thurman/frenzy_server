'use strict';

const expect = require('../../../helpers/expect-preconfigured');
const {
  seedRoundOf16,
  seedQuarterfinal,
  seedSemifinal,
  seedFinal,
  seedThirdPlace,
} = require('../../../../server/lib/bracket/seed-bracket');
const {given8GroupsOfFourTeams} = require('../../../helpers/pro-team.helpers');
const {givenValidBracketData, givenBracketData} = require('../../../helpers/bracket.helpers');
const {flatten} = require('lodash');

describe('SeedBracket: unit', () => {
  let teams;
  beforeEach('given 32 pro teams', () => {
    teams = given8GroupsOfFourTeams().proTeams;
  });

  let bracket;
  beforeEach('given a bracket', () => {
    bracket = givenValidBracketData(teams);
  });

  describe('seedRoundOf16', () => {
    it('should populate with the 1st and 2nd place teams from each group', () => {
      bracket = seedRoundOf16(bracket);

      const groupPairs = [
        ['a', 'b'],
        ['c', 'd'],
        ['e', 'f'],
        ['g', 'h'],
      ];
      const validPicks = bracket.validPicks.roundOf16.toObject();

      for (const [firstGroup, secondGroup] of groupPairs) {
        const [firstGroup1stPlace, firstGroup2ndPlace] = bracket.picks.groups[firstGroup].toObject();
        const [secondGroup1stPlace, secondGroup2ndPlace] = bracket.picks.groups[secondGroup].toObject();

        expect(validPicks[firstGroup + secondGroup])
          .to.have.deep.ordered.members([firstGroup1stPlace, secondGroup2ndPlace]);
        expect(validPicks[secondGroup + firstGroup])
          .to.have.deep.ordered.members([secondGroup1stPlace, firstGroup2ndPlace]);
      }
    });
  });

  describe('seedQuarterfinal', () => {
    it('should populate with the winners of the round of 16', () => {
      bracket = seedQuarterfinal(bracket);

      const prevRoundWinners = Object.values(bracket.picks.roundOf16.toObject());
      const validPicksArr = flatten(Object.values(bracket.validPicks.quarterfinal.toObject()));

      expect(validPicksArr).to.have.deep.members(prevRoundWinners);
    });
  });

  describe('seedSemifinal', () => {
    it('should populate with the winners of the quarterfinal', () => {
      bracket = seedSemifinal(bracket);

      const prevRoundWinners = Object.values(bracket.picks.quarterfinal.toObject());
      const validPicksArr = flatten(Object.values(bracket.validPicks.semifinal.toObject()));

      expect(validPicksArr).to.have.deep.members(prevRoundWinners);
    });
  });

  describe('seedThirdPlace', () => {
    it('should populate with the losers of the semifinal', () => {
      bracket = seedThirdPlace(bracket);

      const prevRoundWinners = Object.values(bracket.picks.semifinal.toObject());
      const prevRoundCompetitors = Object.values(bracket.picks.quarterfinal.toObject());
      const prevRoundLosers = prevRoundCompetitors.filter(competitor => {
        return !prevRoundWinners.some(winner => winner.proTeamId === competitor.proTeamId);
      });
      const validPicksArr = bracket.validPicks.thirdPlace.toObject();

      expect(validPicksArr).to.have.deep.members(prevRoundLosers);
    });
  });

  describe('seedFinal', () => {
    it('should populate with the winners of the semifinal', () => {
      bracket = seedFinal(bracket);

      const prevRoundWinners = Object.values(bracket.picks.semifinal.toObject());
      const validPicksArr = bracket.validPicks.final.toObject();

      expect(validPicksArr).to.have.deep.members(prevRoundWinners);
    });
  });
});
