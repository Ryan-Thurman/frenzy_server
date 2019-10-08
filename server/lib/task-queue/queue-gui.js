/**
 * Configures admin UI for managing [Bull](https://github.com/OptimalBits/bull) queues.
 *
 * @see https://github.com/bee-queue/arena
 */
'use strict';

const Arena = require('bull-arena');
const taskListManager = require('./task-list-manager');

module.exports = class QueueGUI {
  /**
   * Set up the GUI at /queue
   * @param {l.LoopbackApplication} app Application on which to register routing middleware
   */
  static registerGUIRoute(app) {
    const tasks = taskListManager.getTaskList();

    const arena = Arena({
      queues: tasks.map(task => {
        return {
          name: task.name,
          hostId: 'frenzy-task-queue',
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASS,
        };
      }),
    }, {
      disableListen: true,
      basePath: '/queue',
    });

    app.use(arena);
  }
};
