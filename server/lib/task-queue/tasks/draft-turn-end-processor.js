/** This worker task locates all drafts with turns that need to be ended and does so */

// @TODO Make more performant

'use strict';

const app = require('../../../server');
const debug = require('debug')('frenzy:draft');
const {FantasyLeague} = app.models;
const realtimeServer = require('../../realtime-server');
const DraftLifecycle = require('../../fantasy-league/draft/lifecycle');

module.exports = async job => {
  // Skip this job until realtimeServer is ready
  if (!realtimeServer.isInitialized()) return Promise.reject('Realtime server not ready');

  // End the draft turn
  const leaguesWithExpiredTurns = await FantasyLeague.find({
    where: {
      leagueState: FantasyLeague.LEAGUE_STATE.DRAFTING,
      currentPickEndsAt: {lte: new Date()},
    },
  });

  debug('Found %d leagues waiting to end a draft turn', leaguesWithExpiredTurns.length);

  for (const league of leaguesWithExpiredTurns) {
    await DraftLifecycle.endDraftTurn(league);

    // Update task progress
    job.progress((leaguesWithExpiredTurns.indexOf(league) + 1) / leaguesWithExpiredTurns.length * 100);
  }
};
