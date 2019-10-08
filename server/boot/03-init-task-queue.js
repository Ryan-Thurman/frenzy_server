/** Queue all enabled tasks */

'use strict';

const queueManager = require('../lib/task-queue/queue-manager');

module.exports = function(app, done) {
  queueManager.init().then(() => done());
};
