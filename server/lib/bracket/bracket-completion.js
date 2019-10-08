'use strict';

const {get} = require('lodash');

/**
 * Determines whether brackets are fully filled with picks.
 * These methods assume the bracket has already been validated
 * @see ValidateBracket
 */
const BracketCompletion = module.exports = {
  /**
   * Determines whether any round is fully selected
   * @param {string} roundName `groups`, `roundOf16`, `quarterfinal`, `semifinal`, `final`, `thirdPLace`
   * @param {Bracket} bracket
   * @return {boolean}
   */
  bracketIsCompleteForRound: function(bracket, roundName) {
    switch (roundName) {
      case 'groups':
        return BracketCompletion.bracketIsCompleteForGroups(bracket);
      case 'roundOf16':
      case 'quarterfinal':
      case 'semifinal':
        return BracketCompletion.bracketIsCompleteForIntermediateRound(bracket, roundName);
      case 'final':
      case 'thirdPlace':
        return BracketCompletion.bracketIsCompleteForClosingRound(bracket, roundName);
    }
  },

  /**
   * Determines whether groups are fully selected
   * @param {Bracket} bracket
   * @return {boolean}
   */
  bracketIsCompleteForGroups: function(bracket) {
    const groupPicks = get(bracket.toObject(), ['picks', 'groups']);

    for (const group of Object.values(groupPicks)) {
    // Makes sure each group has 4 selections
      if (group.length !== 4) return false;

      // Make sure each selection has a team ID
      for (const teamPick of group) {
        const teamPickId = get(teamPick, 'proTeamId');
        if (!teamPickId) return false;
      }
    }

    return true;
  },

  /**
   * Determines whether an intermediate round is fully selected
   * @param {string} roundName `roundOf16`, `quarterfinal`, or `semifinal`
   * @param {Bracket} bracket
   * @return {boolean}
   */
  bracketIsCompleteForIntermediateRound: function(bracket, roundName) {
    const roundPicks = get(bracket.toObject(), ['picks', roundName]);

    for (const teamPick of Object.values(roundPicks)) {
      // Make sure each selection has a team ID
      const teamPickId = get(teamPick, 'proTeamId');
      if (!teamPickId) return false;
    }

    return true;
  },

  /**
   * Determines whether a closing round is fully selected
   * @param {string} roundName `final`, `thirdPlace`
   * @param {Bracket} bracket
   * @return {boolean}
   */
  bracketIsCompleteForClosingRound: function(bracket, roundName) {
    const matchPickTeamId = get(bracket.toObject(), ['picks', roundName, 'proTeamId']);
    return matchPickTeamId ? true : false;
  },
};
