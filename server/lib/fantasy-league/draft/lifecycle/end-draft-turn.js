'use strict';

const app = require('../../../../server');
const debug = require('debug')('frenzy:draft');
const autoSelect = require('../auto-select');

/**
 * Ends the current picking round for the draft.
 * If all picks are complete, ends the draft.
 * If more picks need to be made, starts the next draft turn.
 * @param {FantasyLeague} fantasyLeague League for which to end the draft turn
 * @returns {Promise}
 */
module.exports = async function endDraftTurn(fantasyLeague) {
  debug('Ending draft turn for fantasy league %d', fantasyLeague.id);

  // Notify clients of end of turn
  app.models.DraftEvent.send(fantasyLeague.id, 'pickTurnEnded', {
    fantasyLeagueId: fantasyLeague.id,
    fantasyTeamId: fantasyLeague.currentPickingFantasyTeamId,
    pickNumber: fantasyLeague.currentPickNumber,
  });

  // Autoselect if necessary
  await autoSelect.autoSelectForCurrentPick(fantasyLeague);

  // Determine whether to end draft or start the next turn
  const teams = await app.models.FantasyTeam.find({
    where: {fantasyLeagueId: fantasyLeague.id},
    include: 'players',
  });

  // Note: What to do if teams never fill because no eligible players remain?
  const allTeamsAreFull = teams.every(t => t.players().length === fantasyLeague.playersPerTeam);

  if (allTeamsAreFull) {
    await this.endDraft(fantasyLeague);
  } else {
    await this.startNextDraftTurn(fantasyLeague);
  }
};
