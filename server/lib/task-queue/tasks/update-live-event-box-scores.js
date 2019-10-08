'use strict';

const app = require('../../../server');
const {pollEventBoxScores} = require('../../live-event-box-scores-updater');

module.exports = async job => pollEventBoxScores(app);
