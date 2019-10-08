'use strict';

const {expect} = require('chai');
const {givenEmptyRedis} = require('../../../../helpers/redis.helpers');
const sinon = require('sinon');
const queueManager = require('../../../../../server/lib/task-queue/queue-manager');
const taskListManager = require('../../../../../server/lib/task-queue/task-list-manager');

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const MAX_INT = 2147483647;

describe('integration: QueueManager', () => {
  let clock;
  beforeEach('given fake timers', () => clock = sinon.useFakeTimers());
  afterEach('clean up fake timers', () => clock.restore());

  beforeEach(givenEmptyRedis);

  afterEach('empty queue', () => queueManager.removeAll());
  afterEach('reset task list', () => taskListManager.resetToDefault());

  it('should schedule a task to run once per day at 5am UTC', done => {
    // Set up
    taskListManager.useTaskList([
      new taskListManager.Task({
        name: 'test-task',
        process: function() { /* dummy */ },
        cron: '0 5 * * *',
        limit: 6,
      }),
    ]);

    const testInterval = ONE_DAY + ONE_SECOND;

    // Activate configured tasks
    queueManager
      .init({
        settings: {
          guardInterval: MAX_INT,
          stalledInterval: MAX_INT,
          drainDelay: 1, // Small delay so that .close is faster.
        },
      })
      .then(queues => {
        // A lot of this code was ripped straight out of the Bull tests
        let counter = 0;
        let prev;

        queues[0].on('completed', job => {
          // Simulate passage of 1 day
          clock.tick(testInterval);

          if (prev) {
            expect(prev.timestamp).to.be.lt(job.timestamp);
            expect(job.timestamp - prev.timestamp).to.be.gte(ONE_DAY);
          }
          prev = job;
          counter++;
          if (counter == 5) {
            done();
          }
        });

        queues[0].on('error', err => done(err));
        queues[0].on('failed', (job, err) => done(err));

        clock.tick(testInterval);
      })
      .catch(done);
  });

  it('should clean up old repeating jobs', async () => {
    // Set up
    taskListManager.useTaskList([
      new taskListManager.Task({
        name: 'test-task',
        process: function() { /* dummy */ },
        cron: '0 5 * * *',
        timeToKeepLogs: 2 * ONE_DAY,
        limit: 6,
      }),
    ]);

    const testInterval = ONE_DAY + ONE_SECOND;

    const queues = await queueManager.init({
      settings: {
        guardInterval: MAX_INT,
        stalledInterval: MAX_INT,
        drainDelay: 1, // Small delay so that .close is faster.
      },
    });

    await new Promise((resolve, reject) => {
      let counter = 0;

      queues[0].on('completed', async job => {
        try {
          const jobs = await queues[0].getJobs();
          expect(jobs.length).to.be.lessThan(5);

          counter++;
          if (counter == 5) {
            resolve();
          } else {
            // Simulate passage of 1 day
            clock.tick(testInterval);
          }
        } catch (e) {
          reject(e);
        }
      });

      queues[0].on('error', err => reject(err));
      queues[0].on('failed', err => reject(err));

      clock.tick(testInterval);
    });
  });
});
