/** Configuration data for tasks to feed the QueueManager during application boot */

'use strict';

class TaskListManager {
  constructor() {
    /**
     * A task configuration object to be consumed by the QueueManager.
     * Tasks will be run as a separate process.
     *
     * @prop {string} name Unique name for this task
     * @prop {string|Function} process Absolute path to a task processor file, with extension, or processor function
     * @prop {number} every How often to run the task in ms. Either this or `cron` should be provided.
     * @prop {number} limit Max number of times the task should repeat
     * @prop {string} cron Cron string to define how often the task should run; all times in UTC
     * @prop {number} timeToKeepLogs Duration in ms for which to keep a record of completed or failed jobs
     * @prop {string} envSwitch Name of an environment variable that must be truthy for this task to be enabled
     */
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

    const SECOND = 1000,
      MINUTE = 60 * SECOND,
      HOUR = 60 * MINUTE,
      DAY = 24 * HOUR;

    this._defaultTaskList = [
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

    this.resetToDefault();

    this.Task = Task;
  }

  /**
   * @return {Array<Task>} The active task list
   */
  getTaskList() {
    return this._taskList;
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
    this._taskList = newTaskList;
  }

  /**
   * Resets the task list to its original state
   */
  resetToDefault() {
    this.useTaskList(this._defaultTaskList);
  }
}

module.exports = new TaskListManager();
