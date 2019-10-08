'use strict';

const app = require('../../../../server');
const eventScheduler = require('../../event-scheduler');
const debug = require('debug')('frenzy:draft');
const {FantasyLeague} = app.models;

/**
 * Ends the draft.
 * @param {FantasyLeague} fantasyLeague League for which to end the draft
 * @returns {Promise}
 */
module.exports = async function endDraft(fantasyLeague) {
  debug('Ending draft for league %d', fantasyLeague.id);

  // Update league state
  await fantasyLeague.updateAttributes({
    leagueState: FantasyLeague.LEAGUE_STATE.POST_DRAFT,
  });

  // Schedule events
  await eventScheduler.scheduleEvents(fantasyLeague);

  // Notify the lobby
  await app.models.DraftEvent.send(fantasyLeague.id, 'draftEnd', {
    fantasyLeagueId: fantasyLeague.id,
  });
};
