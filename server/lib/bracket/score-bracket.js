'use strict';

const debug = require('debug')('frenzy:bracket:score-bracket');

const POINTS_PER_CORRECT_PICK = {
  groups: 1,
  roundOf16: 2,
  quarterfinal: 4,
  semifinal: 8,
  final: 16,
};

/**
 * Scores World Cup brackets
 * @param {bracket} bracket Bracket to score
 * @param {Array<ProTeam>} proTeams All of the teams participating in the tournament
 * @param {Array<ProEvent>} proEvents All of the events in the tournament
 * @returns {number} The number of points the bracket wins
 */
module.exports = function scoreBracket(bracket, teams, events) {
  let score = 0;
  score += scoreGroups(bracket, teams, events);
  score += scoreRound(16, 'roundOf16', 'Round of 16', bracket, events);
  score += scoreRound(8, 'quarterfinal', 'Quarterfinal', bracket, events);
  score += scoreRound(4, 'semifinal', 'Semifinal', bracket, events);
  score += scoreFinal(bracket, events);
  return score;
};

function scoreGroups(bracket, teams, events) {
  // Don't score this round yet if events are not confirmed
  if (!allEventsOfRoundAreConfirmed(events, 'Group Stage')) return 0;

  const groupPicks = bracket.picks.groups;

  let score = 0;

  for (const team of teams) {
    debug('evaluating team %d in group %s with rank %d', team.id, team.fifaGroup, team.fifaGroupRank);
    if (!team.fifaGroup) continue;
    if (!team.fifaGroupRank) continue;

    if (groupPicks[team.fifaGroup][team.fifaGroupRank - 1].proTeamId === team.id) {
      score += POINTS_PER_CORRECT_PICK.groups;
      debug('+%d point', POINTS_PER_CORRECT_PICK.groups);
    }
  }

  return score;
}

function scoreRound(teamCount, ourKey, statsKey, bracket, events) {
  // Don't score this round yet if events are not confirmed
  if (!allEventsOfRoundAreConfirmed(events, statsKey)) return 0;

  const roundPicks = Object.values(bracket.picks.toObject()[ourKey]);
  const pointPerCorrectPick = POINTS_PER_CORRECT_PICK[ourKey];
  const eventCount = teamCount / 2;
  const roundEvents = events.filter(event => event.round === statsKey);

  let score = 0;

  for (const pick of roundPicks) {
    const correctPick = roundEvents.some(event => event.winnerId === pick.proTeamId);
    if (correctPick) {
      score += pointPerCorrectPick;
      debug('+%d points', pointPerCorrectPick);
    }
  }

  return score;
}

function scoreFinal(bracket, events) {
  // Don't score this round yet if events are not confirmed
  if (!allEventsOfRoundAreConfirmed(events, 'Final')) return 0;

  // This shouldn't happen normally, but it allows us to run sparser tests
  if (!bracket.picks.final) return 0;

  const finalPickId = bracket.picks.final.proTeamId;
  const finalEvent = events.find(event => event.round === 'Final');

  if (!finalEvent) return 0;
  if (!finalEvent.scoreConfirmed) return 0;

  if (finalPickId === finalEvent.winnerId) {
    debug('+%d points', POINTS_PER_CORRECT_PICK.final);
    return POINTS_PER_CORRECT_PICK.final;
  }

  return 0;
}

function allEventsOfRoundAreConfirmed(events, round) {
  return events
    .filter(event => event.round === round)
    .every(event => event.scoreConfirmed);
}
