'use strict';

const app = require('../../server/server');
const {merge} = require('lodash');
const {
  seedGroups,
  seedRoundOf16,
  seedQuarterfinal,
  seedSemifinal,
  seedFinal,
  seedThirdPlace,
} = require('../../server/lib/bracket/seed-bracket');
const {Bracket, BracketTeamPick} = app.models;

module.exports = {
  givenBracketData,
  givenBracket,
  givenValidBracketData,
};

function givenBracketData(data) {
  return merge({
    earnedPoints: 0,
    totalPotentialPoints: 96,
    submitted: false,
    isComplete: false,
    picks: {
      groups: {
        a: [],
        b: [],
        c: [],
        d: [],
        e: [],
        f: [],
        g: [],
        h: [],
      },
      roundOf16: {
        ab: null,
        cd: null,
        ef: null,
        gh: null,
        ba: null,
        dc: null,
        fe: null,
        hg: null,
      },
      quarterfinal: {
        abcd: null,
        efgh: null,
        badc: null,
        fehg: null,
      },
      semifinal: {
        abcdefgh: null,
        badcfehg: null,
      },
      final: null,
      thirdPlace: null,
    },
    validPicks: {
      groups: {
        a: [],
        b: [],
        c: [],
        d: [],
        e: [],
        f: [],
        g: [],
        h: [],
      },
      roundOf16: {
        ab: [],
        cd: [],
        ef: [],
        gh: [],
        ba: [],
        dc: [],
        fe: [],
        hg: [],
      },
      quarterfinal: {
        abcd: [],
        efgh: [],
        badc: [],
        fehg: [],
      },
      semifinal: {
        abcdefgh: [],
        badcfehg: [],
      },
      final: [],
      thirdPlace: [],
    },
  }, data);
}

/**
 * Generates a valid bracket for the given tournament teams
 * @param {Array<ProTeam>} proTeams Team participating in the tournament
 * @param {object} [data] Overrides for default properties in the returned bracket
 * @returns {Bracket}
 */
function givenValidBracketData(proTeams, data = {}) {
  // Just a little data validation
  if (proTeams.length !== 32) throw new Error('Expecting 32 teams');
  if (!proTeams.every(team => team.fifaGroup)) throw new Error('Expecting all teams to have a fifaGroup');

  let bracket = new Bracket(givenBracketData(data));

  // Get valid Group stage picks
  bracket = seedGroups(bracket, proTeams);

  // Populate group picks
  const GroupPicks = bracket.picks.groups.constructor;
  bracket.picks.groups = new GroupPicks(bracket.validPicks.groups.toObject());

  // Get valid Round of 16 picks
  bracket = seedRoundOf16(bracket);

  // Make picks
  const RoundOf16Picks = bracket.picks.roundOf16.constructor;
  bracket.picks.roundOf16 = pickFirstValidForRound(bracket.validPicks.roundOf16, RoundOf16Picks);

  // Get valid quarterfinal picks
  bracket = seedQuarterfinal(bracket);

  // Make picks
  const QuarterfinalPicks = bracket.picks.quarterfinal.constructor;
  bracket.picks.quarterfinal = pickFirstValidForRound(bracket.validPicks.quarterfinal, QuarterfinalPicks);

  // Get valid semifinal picks
  bracket = seedSemifinal(bracket);

  // Make picks
  const SemifinalPicks = bracket.picks.semifinal.constructor;
  bracket.picks.semifinal = pickFirstValidForRound(bracket.validPicks.semifinal, SemifinalPicks);

  // Get valid final picks
  bracket = seedFinal(bracket);

  // Make pick
  bracket.picks.final = bracket.validPicks.final[0].clone();

  // Get valid third place picks
  bracket = seedThirdPlace(bracket);

  // Make pick
  bracket.picks.thirdPlace = bracket.validPicks.thirdPlace[0].clone();

  return bracket;
}

/** @return {Promise<Bracket>} */
async function givenBracket(data) {
  return Bracket.create(givenBracketData(data));
}

/**
 * Internal helper function that creates a picks
 * object referencing the first valid pick for each match
 * @param {loopback.Model} roundValidPicks validPicks.roundOf16, .quarterfinal, or .semifinal
 * @param {Function<loopback.Model>} PicksModel Constructor function for picks object
 */
function pickFirstValidForRound(roundValidPicks, PicksModel) {
  const picks = new PicksModel();

  for (const [match, validPicks] of Object.entries(roundValidPicks.toObject())) {
    picks[match] = new BracketTeamPick(validPicks[0]);
  }

  return picks;
}
