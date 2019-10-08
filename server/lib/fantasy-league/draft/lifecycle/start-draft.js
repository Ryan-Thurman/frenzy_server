'use strict';

const app = require('../../../../server');
const debug = require('debug')('frenzy:draft');
const {FantasyLeague, DraftEvent} = app.models;
const {shuffle} = require('lodash');

/**
 * Starts the draft, if it has enough players, else cancels the draft.
 * @param {FantasyLeague} fantasyLeague League for which to start the draft
 * @returns {Promise}
 */
module.exports = async function startDraft(fantasyLeague) {
  debug('Starting draft for league %d', fantasyLeague.id);

  const shouldStartDraft = await fantasyLeague.hasEnoughPlayers();

  let leagueState, eventName;
  const eventData = {fantasyLeagueId: fantasyLeague.id};
  if (shouldStartDraft) {
    leagueState = FantasyLeague.LEAGUE_STATE.DRAFTING;
    eventName = 'draftStart';
  } else {
    leagueState = FantasyLeague.LEAGUE_STATE.CANCELLED;
    eventName = 'draftCancelled';
    eventData.reason = 'There were not enough players to start the draft.';
    debug('Aborting draft for league %d', fantasyLeague.id);
  }

  // @todo Batch these queries into a deferred transaction

  // Randomize the pick order
  if (leagueState === FantasyLeague.LEAGUE_STATE.DRAFTING) {
    let teams = await fantasyLeague.fantasyTeams({
      // fields: {id: true, fantasyLeagueId: true, pickOrder: true},
    });
    teams = shuffle(teams);
    for (let i = 0; i < teams.length; i++) {
      await teams[i].updateAttribute('pickOrder', i);
    }
  }

  // Update the league state
  await fantasyLeague.updateAttribute('leagueState', leagueState);

  // Send the event to the draft lobby
  DraftEvent.send(fantasyLeague.id, eventName, eventData);

  // Start first draft round
  if (leagueState === FantasyLeague.LEAGUE_STATE.DRAFTING) {
    await this.startNextDraftTurn(fantasyLeague);
  }
};
