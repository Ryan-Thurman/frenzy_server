"use strict";

const Queue = require("bull");
const taskListManager = require("./task-list-manager");

/**
 * Configures and tracks recurring scheduled tasks
 * @prop {Array<Bull.Queue>} queues Currently active task queues
 */
class QueueManager {
  constructor() {
    this.queues = [];
  }
  /**
   * Activate all enabled tasks configured in the taskListManager
   * @param {object} options Options to pass to Bull.Queue constructor
   * @return {Array<Bull.Queue>} The newly active task queues
   */
  async init(options) {
    this._options = Object.assign(
      {
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASS,
        },
      },
      options
    );

    /**
     * @type {Array<Function>} These will be run hourly to clear out old logs
     */
    this._jobCleanerCallbacks = [];

    const tasks = taskListManager.getTaskList();

    for (const task of tasks) {
      //   if (!task.isEnabled()) continue;

      await this.add(task);
    }

    if (this._jobCleanerCallbacks.length) {
      await this._startJobCleaner();
    }

    return this.queues;
  }

  /**
   * Adds a task to a new Queue
   * @param {Task} task The task to add
   * @return {Promise<Bull.Queue>} The configured queue
   */
  async add(task) {
    const taskQueue = new Queue(task.name, this._options);

    taskQueue.process(task.process);

    const taskOptions = {};

    if (task.cron) {
      taskOptions.repeat = {
        cron: task.cron,
        tz: "UTC",
      };
    }
    if (task.every) {
      taskOptions.repeat = { every: task.every };
    }
    if (taskOptions.repeat && task.limit) {
      taskOptions.repeat.limit = task.limit;
    }

    if (!task.timeToKeepLogs) {
      Object.assign(taskOptions, {
        removeOnComplete: true,
        removeOnFail: true,
      });
    }

    await taskQueue.add(null, taskOptions);

    this._registerErrorHandlers(taskQueue, task.name);

    if (task.timeToKeepLogs > 0) {
      this._jobCleanerCallbacks.push(async () =>
        this._cleanQueue(taskQueue, task.name, task.timeToKeepLogs)
      );
    }

    this.queues.push(taskQueue);

    return taskQueue;
  }

  /**
   * Adds a special recurring job that cleans out old logs from the other repeating jobs
   */
  async _startJobCleaner() {
    const JOB_CLEANER_NAME = "jobCleaner";

    this._jobCleanerQueue = new Queue(JOB_CLEANER_NAME, this._options);

    this._jobCleanerQueue.process(async (job) => {
      for (const cleanJobs of this._jobCleanerCallbacks) {
        await cleanJobs();
      }
    });

    await this._jobCleanerQueue.add(null, {
      repeat: {
        every: 5 * 60 * 1000, // Every five minutes
      },
      removeOnComplete: true,
      removeOnFail: true,
    });

    this._registerErrorHandlers(this._jobCleanerQueue, JOB_CLEANER_NAME);
  }

  /**
   * Add a callback to this._jobCleanerCallbacks that cleans
   * @param {Bull.Queue} queue The queue to clean
   * @param {string} taskName Name of the associated task
   * @param {number} timeToKeepLogs Duration in ms for which to keep a record of completed or failed jobs
   */
  async _cleanQueue(queue, taskName, timeToKeepLogs) {
    const cleanedCompletedJobs = await queue.clean(timeToKeepLogs, "completed");
    const cleanedFailedJobs = await queue.clean(timeToKeepLogs, "failed");

    if (cleanedCompletedJobs.length || cleanedFailedJobs.length) {
      console.log(
        "QueueManager: Cleaned %s completed jobs and %s failed jobs for task %s",
        cleanedCompletedJobs.length,
        cleanedFailedJobs.length,
        taskName
      );
    }
  }

  /**
   * Sets up error event handlers on the given queue for logging
   * @param {Bull.Queue} queue
   * @param {string} taskName
   */
  _registerErrorHandlers(queue, taskName) {
    queue.on("stalled", (job) =>
      console.error(`QueueManager: Task ${taskName} has stalled.`, job)
    );
    queue.on("failed", (job, err) =>
      console.error(`QueueManager: Task ${taskName} has failed.`, job, err)
    );
    queue.on("error", (err) =>
      console.error(
        `QueueManager: Task ${taskName} has produced an error.`,
        err
      )
    );
  }

  /**
   * Removes all active task queues
   * @return {Promise}
   */
  async removeAll() {
    // Shut down the job cleaner queue
    if (this._jobCleanerCallbacks.length) {
      await this._jobCleanerQueue.clean(0, "wait");
      await this._jobCleanerQueue.clean(0, "active");
      await this._jobCleanerQueue.clean(0, "delayed");
      await this._jobCleanerQueue.empty();
      await this._jobCleanerQueue.close();
      delete this._jobCleanerQueue;
      this._jobCleanerCallbacks = [];
    }

    // Shut down the rest of the queues
    for (const queue of this.queues) {
      await queue.clean(0, "completed");
      await queue.clean(0, "wait");
      await queue.clean(0, "active");
      await queue.clean(0, "delayed");
      await queue.clean(0, "failed");
      await queue.empty();
      await queue.close();
    }
    this.queues = [];
  }
}

module.exports = new QueueManager();
