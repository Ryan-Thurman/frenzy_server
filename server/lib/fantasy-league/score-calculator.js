'use strict';
/**
 * @module FantasyLeague.ScoreCalculator
 * @description Scoring library for fantasy leagues
 */

module.exports = {
  scorePlayerInFantasyEvent,
};

/**
 * Uses a player's fantasy event stats to get their point total for that event
 * @param {FantasyEventPlayerStats} eventPlayerStats Player's aggregated stats for the fantasy event
 * @param {FantasyLeague} fantasyLeague Use the scoring rules from this league
 * @returns {number} The point total
 */
function scorePlayerInFantasyEvent(eventPlayerStats, fantasyLeague) {
  let points = 0;
  // @todo pointsForPlay60
  // @todo pointsForPlay90
  // @todo pointsForDefGoal
  // @todo pointsForMidGoal
  // @todo pointsForFwdGoal
  points += eventPlayerStats.assists * fantasyLeague.pointsForAssist;
  // @todo pointsForDribble
  points += eventPlayerStats.offsides * fantasyLeague.pointsForOffsides;
  // @todo pointsForDefCleanSheet
  // @todo pointsForKeeperCleanSheet
  // @todo pointsForMidCleanSheet
  // @todo pointsForPass70, pointsForPass80, pointsForPass90
  points += eventPlayerStats.keyPasses * fantasyLeague.pointsForKeyPass;
  // @todo pointsForBigChance
  points += eventPlayerStats.saves * fantasyLeague.pointsForSave;
  points += eventPlayerStats.tackles * fantasyLeague.pointsForTackle;
  // @todo pointsForPenSave
  // @todo pointsForPenMiss
  // @todo pointsForKeeperGoalAllowed
  // @todo pointsForDefGoalAllowed
  points += eventPlayerStats.clears * fantasyLeague.pointsForClearance;
  points += eventPlayerStats.blocks * fantasyLeague.pointsForBlocks;
  points += eventPlayerStats.interceptions * fantasyLeague.pointsForInterceptions;
  points += eventPlayerStats.yellowCards * fantasyLeague.pointsForYellowCard;
  points += eventPlayerStats.redCards * fantasyLeague.pointsForRedCard;
  points += eventPlayerStats.ownGoals * fantasyLeague.pointsForOwnGoal;
  // @todo pointsForOwnGoalError

  return points;
}
