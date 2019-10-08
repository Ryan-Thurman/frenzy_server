/** This worker task locates all drafts that need to be started and then attempts to do so. */

'use strict';

const app = require('../../../server');
const debug = require('debug')('frenzy:draft');
const {FantasyLeague} = app.models;
const realtimeServer = require('../../realtime-server');
const DraftLifecycle = require('../../fantasy-league/draft/lifecycle');

module.exports = async job => {
  // Skip this job until realtimeServer is ready
  if (!realtimeServer.isInitialized()) return Promise.reject('Realtime server not ready');

  // Start the draft
  const draftingLeaguesToStart = await FantasyLeague.find({
    where: {
      leagueState: FantasyLeague.LEAGUE_STATE.PRE_DRAFT,
      draftDate: {lte: new Date()},
    },
  });

  debug('Found %d leagues waiting to start drafting', draftingLeaguesToStart.length);

  for (const league of draftingLeaguesToStart) {
    await DraftLifecycle.startDraft(league);

    // Update task progress
    job.progress((draftingLeaguesToStart.indexOf(league) + 1) / draftingLeaguesToStart.length * 100);
  }
};
