'use strict';

const {get} = require('lodash');
const app = require('../../server');

/**
 * The validation object this method will return when validating a bracket
 * @prop {boolean} valid True is the bracket is valid, otherwise, false
 * @prop {string} [message] The reason given for the result
 */
class ValidationResult {
  constructor(valid, message) {
    this.valid = valid;
    if (valid && !message) message = 'Bracket is valid';
    this.message = message;
  }

  /**
   * Throws an error if the validation result is invalid
   * @param {number} statusCode HTTP status code to be added to `status` property on thrown error
   */
  throwIfInvalid(statusCode) {
    if (!this.valid) {
      const err = new Error(this.message);
      err.status = statusCode;
      throw err;
    }
  }
}

/**
 * Collection of methods that validate brackets and return a ValidationResult.
 * In general, each round of bracket.picks has 2 valid states:
 *   1. Empty / initial state
 *   2. Filled with valid data
 */
const ValidateBracket = module.exports = {
  /**
   * @param {Bracket} currentBracket The bracket to validate
   * @param {Array<ProTeam>} teams The teams participating in the tournament
   * @returns {ValidationResult} The results of the validation check for the bracket
   */
  validateGroupsPicks: function(bracket, teams) {
    const groupPicks = get(bracket.toObject(), ['picks', 'groups']);
    if (!groupPicks)
      return new ValidationResult(false, 'Group picks not found');

    // Validate group picks
    for (const [groupKey, group] of Object.entries(groupPicks)) {
      // Check length of the group picks
      if (group.length === 0)
        return new ValidationResult(true);
      if (group.length !== 4)
        return new ValidationResult(false, `Group ${groupKey} does not have 4 teams`);

      // Check the following:
      // - Every team in the group exists
      // - Only once instance of the team id exists
      const teamsInGroup = teams.filter(team => team.fifaGroup === groupKey);
      for (const team of teamsInGroup) {
        const matchingTeamsById = group.filter(groupTeam => team.id === groupTeam.proTeamId);

        if (matchingTeamsById.length === 0) {
          return new ValidationResult(false, `The team ${team.name} is missing in group ${groupKey}`);
        } else if (matchingTeamsById.length > 1) {
          return new ValidationResult(false, `The team ${team.name} appears multiple times in group ${groupKey}`);
        }
      }
    }

    return new ValidationResult(true);
  },

  /**
   * @param {string} roundName The name of the round to validate, one of 'roundOf16', 'quarterfinal', 'semifinal'
   * @param {Bracket} currentBracket The bracket to validate
   * @returns {ValidationResult} The results of the validation check for the bracket
   */
  validateRoundPicks: function(roundName, currentBracket) {
    const roundPicks = get(currentBracket.toObject(), ['picks', roundName]);

    if (!roundPicks)
      return new ValidationResult(false, `${roundName} picks not found`);

    for (const [matchKey, matchPick] of Object.entries(roundPicks)) {
      if (!matchPick) continue;

      const validMatchPicks = currentBracket.validPicks[roundName][matchKey];
      if (!validMatchPicks.some(validMatchPick => validMatchPick.proTeamId === matchPick.proTeamId))
        return new ValidationResult(false, `Pick ${matchPick.name} is not a valid option for game ${matchKey}`);
    }

    return new ValidationResult(true);
  },

  /**
   * @param {string} roundName The name of the round to validate, one of 'final', 'thirdPlace'
   * @param {Bracket} currentBracket The bracket to validate
   * @returns {ValidationResult} The results of the validation check for the bracket
   */
  validateLastRoundPicks: function(roundName, currentBracket) {
    const matchPick = get(currentBracket.toObject(), ['picks', roundName]);
    if (!matchPick) return new ValidationResult(true);

    const validMatchPicks = currentBracket.validPicks[roundName];

    if (!validMatchPicks.some(validMatchPick => validMatchPick.proTeamId === matchPick.proTeamId))
      return new ValidationResult(false, `Pick ${matchPick.name} is not a valid option for game ${roundName}`);

    return new ValidationResult(true);
  },
};
