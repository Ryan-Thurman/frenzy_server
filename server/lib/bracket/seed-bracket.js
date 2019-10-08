'use strict';

const {get, flatten} = require('lodash');
const app = require('../../server');

const SeedBracket = module.exports = {
  /**
   * Populate validPicks.groups on the supplied bracket
   * @param {Bracket} currentBracket
   * @param {Array<ProTeam>} proTeams All teams participating in the tournament
   * @returns {Bracket} The updated bracket
   */
  seedGroups: function(currentBracket, proTeams) {
    const {BracketTeamPick} = app.models;

    const groups = {};

    for (const team of proTeams) {
      if (!(team.fifaGroup in groups)) groups[team.fifaGroup] = [];
      groups[team.fifaGroup].push(BracketTeamPick.buildFromProTeam(team));
    }

    currentBracket.validPicks.groups = groups;

    return currentBracket;
  },

  /**
   * Populate validPicks.roundOf16 on the supplied bracket
   * @param {Bracket} currentBracket
   * @returns {Bracket} The updated bracket
   */
  seedRoundOf16: function(currentBracket) {
    const roundOf16 = {};

    for (const [firstGroup, secondGroup] of [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']]) {
      roundOf16[firstGroup + secondGroup] = [
        currentBracket.picks.groups[firstGroup][0].clone(),
        currentBracket.picks.groups[secondGroup][1].clone(),
      ];
      roundOf16[secondGroup + firstGroup] = [
        currentBracket.picks.groups[secondGroup][0].clone(),
        currentBracket.picks.groups[firstGroup][1].clone(),
      ];
    }

    currentBracket.validPicks.roundOf16 = roundOf16;

    return currentBracket;
  },

  /**
   * @func seedQuarterfinal
   * @param {Bracket} currentBracket
   * @returns {Bracket} The seeding for the quarterfinal
   */
  seedQuarterfinal: function(currentBracket) {
    // Make sure round of 16 picked
    if (!currentBracket.picks.roundOf16) {
      throw Error('round of 16 was not picked');
    }

    const quarterfinal = {};

    for (const [firstMatch, secondMatch] of [['ab', 'cd'], ['ef', 'gh'], ['ba', 'dc'], ['fe', 'hg']]) {
      if (!currentBracket.picks.roundOf16[firstMatch] || !currentBracket.picks.roundOf16[secondMatch]) continue;
      quarterfinal[firstMatch + secondMatch] = [
        currentBracket.picks.roundOf16[firstMatch].clone(),
        currentBracket.picks.roundOf16[secondMatch].clone(),
      ];
    }

    currentBracket.validPicks.quarterfinal = quarterfinal;

    return currentBracket;
  },

  /**
   * @func seedSemifinal
   * @param {Bracket} currentBracket
   * @returns {Bracket} The seeding for the semifinal
   */
  seedSemifinal: function(currentBracket, teams) {
    // Make sure quarterfinal picked
    if (!currentBracket.picks.quarterfinal) {
      throw Error('quarterfinal was not picked');
    }

    const semifinal = {};

    for (const [firstMatch, secondMatch] of [['abcd', 'efgh'], ['badc', 'fehg']]) {
      if (!currentBracket.picks.quarterfinal[firstMatch] || !currentBracket.picks.quarterfinal[secondMatch]) continue;
      semifinal[firstMatch + secondMatch] = [
        currentBracket.picks.quarterfinal[firstMatch].clone(),
        currentBracket.picks.quarterfinal[secondMatch].clone(),
      ];
    }

    currentBracket.validPicks.semifinal = semifinal;

    return currentBracket;
  },

  /**
   * @func seedThirdPlace
   * @param {Bracket} currentBracket
   * @returns {Bracket} The seeding for the third place game
   */
  seedThirdPlace: function(currentBracket) {
    const semifinalPicks = Object.values(get(currentBracket.toObject(), ['picks', 'semifinal']));
    if (!semifinalPicks) throw new Error('semifinal was not picked');

    const validSemifinalPicks = [
      ...currentBracket.validPicks.semifinal.abcdefgh,
      ...currentBracket.validPicks.semifinal.badcfehg,
    ];

    // All valid semifinal picks that weren't picked as winners
    currentBracket.validPicks.thirdPlace = validSemifinalPicks
      .filter(validPick => {
        return !semifinalPicks.some(pick => pick.proTeamId === validPick.proTeamId);
      })
      .map(validPick => validPick.clone());

    return currentBracket;
  },

  /**
   * @param {Bracket} currentBracket
   * @returns {Bracket} The seeding for the final
   */
  seedFinal: function(currentBracket) {
    const {BracketTeamPick} = app.models;

    const semifinalPicks = get(currentBracket.toObject(), ['picks', 'semifinal']);
    if (!semifinalPicks) throw new Error('semifinal was not picked');

    currentBracket.validPicks.final = Object.values(semifinalPicks)
      .map(validPick => new BracketTeamPick(validPick));

    return currentBracket;
  },
};
