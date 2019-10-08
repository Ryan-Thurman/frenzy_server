'use strict';

const app = require('../../../../server');
const debug = require('debug')('frenzy:draft');
const {getTeamForPickNumber} = require('../snake-draft');

/**
 * Start the next picking round for the draft.
 * If the draft has not yet been started, starts the first picking round.
 * @param {FantasyLeague} fantasyLeague League for which to start the draft
 * @returns {Promise}
 */
module.exports = async function startNextDraftTurn(fantasyLeague) {
  debug('Starting next draft turn for fantasy league %d', fantasyLeague.id);

  const nextPickNumber = fantasyLeague.currentPickNumber ? fantasyLeague.currentPickNumber + 1 : 1;

  // Determine whose turn it is
  const teams = await fantasyLeague.fantasyTeams({
    fields: {
      id: true,
      fantasyLeagueId: true,
      pickOrder: true,
    },
    order: 'pickOrder ASC',
  });
  const nextPickingTeam = getTeamForPickNumber(nextPickNumber, teams);

  debug('Picking team number %d is team id %d', nextPickNumber, nextPickingTeam.id);

  // Calculate picking round timestamps
  const currentPickStartsAt = new Date();
  const currentPickEndsAt = new Date(currentPickStartsAt.getTime() + (fantasyLeague.timePerPick * 1000));

  // Update the league model
  await fantasyLeague.updateAttributes({
    currentPickNumber: nextPickNumber,
    currentPickingFantasyTeamId: nextPickingTeam.id,
    currentPickStartsAt,
    currentPickEndsAt,
  });

  // Notify the lobby
  await app.models.DraftEvent.send(fantasyLeague.id, 'pickTurnStarted', {
    fantasyLeagueId: fantasyLeague.id,
    fantasyTeamId: nextPickingTeam.id,
    currentPickNumber: nextPickNumber,
    currentPickStartsAt,
    currentPickEndsAt,
  });
};
