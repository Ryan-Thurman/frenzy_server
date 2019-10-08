'use strict';

/**
 * @module SnakeDraft
 * @description Snake draft algorithm implementation,
 * where players pick from first to last then last to first.
 */
module.exports = {
  getTeamForPickNumber,
};

/**
 * Retrieves the fantasy team who should be picking for a specific numbered pick round
 * @param {number} pickNumber Current pick number
 * @param {Array<FantasyTeam>} teams Teams participating in the draft, in pick order
 * @returns {FantasyTeam} The team to pick for that turn
 */
function getTeamForPickNumber(pickNumber, teams) {
  const nTeams = teams.length;

  /** Since pickNumber starts counting at 1, we need to zero-index it */
  const pickIdx = pickNumber - 1;
  /** Ascending draft order for odd-numbered rounds e.g. 0, 1, 2, 3, 0, 1, 2, 3... */
  const ascendingSeriesPickIdx = pickIdx % nTeams;
  /** Descending draft order for even-numbered rounds e.g. 3, 2, 1, 0, 3, 2, 1, 0... */
  const descendingSeriesPickIdx = nTeams - 1 - ascendingSeriesPickIdx;

  /** Current pick round, zero-indexed e.g. 0, 0, 0, 0, 1, 1, 1, 1, 2, 2... */
  const pickRound = Math.floor(pickIdx / nTeams);

  /** Both series combined, alternating even and odd rounds e.g. 0, 1, 2, 3, 3, 2, 1, 0, 0, 1... */
  const snakeDraftIdx = pickRound % 2 ? descendingSeriesPickIdx : ascendingSeriesPickIdx;

  return teams[snakeDraftIdx];
}
