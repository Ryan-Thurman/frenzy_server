'use strict';

const app = require('../../../../server/server');
const expect = require('../../../helpers/expect-preconfigured');
const scoreBracket = require('../../../../server/lib/bracket/score-bracket');
const {times} = require('lodash');
const {given8GroupsOfFourTeams} = require('../../../helpers/pro-team.helpers');
const {givenProEventData} = require('../../../helpers/pro-event.helpers');
const {givenBracketData} = require('../../../helpers/bracket.helpers');

const {ProTeam, ProEvent, Bracket, BracketTeamPick} = app.models;

describe('ScoreBracket: unit', () => {
  let proTeams;
  beforeEach('given 8 groups of four teams', () => {
    ({proTeams} = given8GroupsOfFourTeams());
  });

  it('should award 1 point per group round correct pick', () => {
    // By golly, look at that, the teams placed in perfect index order
    proTeams.forEach((proTeam, i) => {
      proTeam.fifaGroupRank = i % 4 + 1;
    });

    const bracket = new Bracket(givenBracketData({
      picks: {
        groups: {
          a: buildGroupPicks(0, 3, 1, 2), // +1 Correct 1st place pick
          b: buildGroupPicks(7, 5, 4, 6), // +1 Correct 2nd place pick
          c: buildGroupPicks(9, 11, 10, 8), // +1 Correct 3rd place pick
          d: buildGroupPicks(13, 14, 12, 15), // +1 Correct 4th place pick
          e: buildGroupPicks(17, 18, 19, 16), // +0 No correct picks
          f: buildGroupPicks(20, 23, 22, 21), // +2 Correct 1st & 3rd place picks
          g: buildGroupPicks(26, 25, 24, 27), // +2 Correct 2nd & 4th place picks
          h: buildGroupPicks(28, 29, 30, 31), // +4 All 4 correct picks
        },
      },
    }));

    const score = scoreBracket(bracket, proTeams, []);
    expect(score).to.equal(12);

    /**
     * Helper method that creates an array of picks from
     * the members of `proTeams` with the given indexes
     * @param {Array<number>} pickIndexes
     * @return {Array<BracketTeamPick>}
     */
    function buildGroupPicks(...pickIndexes) {
      return pickIndexes.map(index => BracketTeamPick.buildFromProTeam(proTeams[index]));
    }
  });

  it('should award 2 points per round of 16 correct pick', () => {
    // The multiples of 4 did really well this round
    const roundOf16Events = times(8, n => {
      return new ProEvent(givenProEventData({
        round: 'Round of 16',
        winnerId: proTeams[n * 4].id,
      }));
    });

    const bracket = new Bracket(givenBracketData({
      picks: {
        roundOf16: {
          ab: BracketTeamPick.buildFromProTeam(proTeams[0]), // +2 Correct pick
          cd: BracketTeamPick.buildFromProTeam(proTeams[4]), // +2 Correct pick
          ef: BracketTeamPick.buildFromProTeam(proTeams[8]), // +2 Correct pick
          gh: BracketTeamPick.buildFromProTeam(proTeams[12]), // +2 Correct pick
          ba: BracketTeamPick.buildFromProTeam(proTeams[16]), // +2 Correct pick
          dc: BracketTeamPick.buildFromProTeam(proTeams[21]), // +0 Incorrect pick
          fe: BracketTeamPick.buildFromProTeam(proTeams[25]), // +0 Incorrect pick
          hg: BracketTeamPick.buildFromProTeam(proTeams[29]), // +0 Incorrect pick
        },
      },
    }));

    const score = scoreBracket(bracket, proTeams, roundOf16Events);
    expect(score).to.equal(10);
  });

  it('should award 4 points per quarterfinal correct pick', () => {
    // The multiples of 8 are doing something right
    const quarterfinalEvents = times(4, n => {
      return new ProEvent(givenProEventData({
        round: 'Quarterfinal',
        winnerId: proTeams[n * 8].id,
      }));
    });

    const bracket = new Bracket(givenBracketData({
      picks: {
        quarterfinal: {
          abcd: BracketTeamPick.buildFromProTeam(proTeams[1]), // +0 Correct pick
          efgh: BracketTeamPick.buildFromProTeam(proTeams[8]), // +4 Correct pick
          badc: BracketTeamPick.buildFromProTeam(proTeams[16]), // +4 Correct pick
          fehg: BracketTeamPick.buildFromProTeam(proTeams[25]), // +0 Incorrect pick
        },
      },
    }));

    const score = scoreBracket(bracket, proTeams, quarterfinalEvents);
    expect(score).to.equal(8);
  });

  it('should award 8 points per semifinal correct pick', () => {
    // Miraculously, the multiples of 16 won them both
    const semifinalEvents = times(2, n => {
      return new ProEvent(givenProEventData({
        round: 'Semifinal',
        winnerId: proTeams[n * 16].id,
      }));
    });

    const bracket = new Bracket(givenBracketData({
      picks: {
        semifinal: {
          abcdefgh: BracketTeamPick.buildFromProTeam(proTeams[8]), // +0 Incorrect pick
          badcfehg: BracketTeamPick.buildFromProTeam(proTeams[16]), // +8 Correct pick
        },
      },
    }));

    const score = scoreBracket(bracket, proTeams, semifinalEvents);
    expect(score).to.equal(8);
  });

  it('should award 16 points for a correct champion pick', () => {
    // Team 0 takes it all
    const championshipEvent = new ProEvent(givenProEventData({
      round: 'Final',
      winnerId: proTeams[0].id,
    }));

    const bracket = new Bracket(givenBracketData({
      picks: {
        final: BracketTeamPick.buildFromProTeam(proTeams[0]), // +16 Correct pick
      },
    }));

    const score = scoreBracket(bracket, proTeams, [championshipEvent]);
    expect(score).to.equal(16);
  });
});
