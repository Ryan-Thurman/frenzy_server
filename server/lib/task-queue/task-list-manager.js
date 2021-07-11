/** Configuration data for tasks to feed the QueueManager during application boot */

'use strict';

const SECOND = 1000,
  MINUTE = 60 * SECOND,
  HOUR = 60 * MINUTE,
  DAY = 24 * HOUR;

class Task {
  /**
   * @param {string} options.name
   * @param {string} options.process
   * @param {number} [options.limit]
   * @param {string} [options.cron]
   * @param {number} [options.every]
   * @param {number} [options.timeToKeepLogs]
   * @param {string} [options.envSwitch]
   */
  constructor(options) {
    Object.assign(this, options);
  }

  /**
   * @return {boolean} Whether this task is active per application configuration
   */
  isEnabled() {
    if (!this.envSwitch) {
      return true;
    }

    return Boolean(process.env[this.envSwitch]);
  }
}

class TaskListManager {
  constructor() {
    this.defaultTaskList = [
      new Task({
        name: 'statsRosterDataImportTask',
        process: require('./tasks/import-stats-rosters'),
        cron: '0 5 * * *', // Daily at 5am UTC,
        timeToKeepLogs: 30 * DAY,
        envSwitch: 'ENABLE_STATS_ROSTER_IMPORT_TASK',
      }),
      new Task({
        name: 'eventScheduleUpdateTask',
        process: require('./tasks/update-event-schedule'),
        cron: '0 5 * * *', // Daily at 5am UTC, @todo, configure this
        timeToKeepLogs: 30 * DAY,
        envSwitch: 'ENABLE_STATS_ROSTER_IMPORT_TASK',
      }),
      new Task({
        name: 'liveEventBoxScoresUpdateTask',
        process: require('./tasks/update-live-event-box-scores'),
        every: 2 * MINUTE,
        timeToKeepLogs: 7 * DAY,
        envSwitch: 'ENABLE_LIVE_BOX_SCORE_UPDATE_TASK',
      }),
      new Task({
        name: 'standingsUpdateTask',
        process: require('./tasks/update-standings'),
        cron: '0 5 * * *', // Daily at 5am UTC, @todo, configure this
        timeToKeepLogs: 30 * DAY,
        envSwitch: 'ENABLE_STANDINGS_UPDATE_TASK',
      }),
      new Task({
        name: 'draftStartProcessor',
        process: require('./tasks/draft-start-processor'),
        every: 2.5 * SECOND,
        timeToKeepLogs: 10 * MINUTE,
        envSwitch: 'RUN_DRAFTS',
      }),
      new Task({
        name: 'draftTurnEndProcessor',
        process: require('./tasks/draft-turn-end-processor'),
        every: 1 * SECOND,
        timeToKeepLogs: 10 * MINUTE,
        envSwitch: 'RUN_DRAFTS',
      }),
    ];

    this.taskList = this.defaultTaskList;

    this.Task = Task;
  }

  /**
   * @return {Array<Task>} The active task list
   */
  getTaskList() {
    return this.taskList;
  }

  /**
   * Sets the active task list
   * @param {Array<Task>} newTaskList The task list to use
   */
  useTaskList(newTaskList) {
    /**
     * List of tasks available for sale
     * @private
     * @type {Array<Task>}
     */
    this.taskList = newTaskList;
  }

  /**
   * Resets the task list to its original state
   */
  resetToDefault() {
    this.useTaskList(this.defaultTaskList);
  }
}

module.exports = new TaskListManager();
