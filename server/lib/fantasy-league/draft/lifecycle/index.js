'use strict';

const startDraft = require('./start-draft');
const startNextDraftTurn = require('./start-next-draft-turn');
const endDraftTurn = require('./end-draft-turn');
const endDraft = require('./end-draft');

/**
 * @module DraftLifecycle
 * @description Provides a library of methods to advance a draft through its lifecycle
 */
module.exports = {
  startDraft,
  startNextDraftTurn,
  endDraftTurn,
  endDraft,
};
