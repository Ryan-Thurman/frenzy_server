'use strict';

const Redis = require('ioredis');

module.exports = {
  givenEmptyRedis,
};

async function givenEmptyRedis() {
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASS,
  });

  await redis.flushall();
  await redis.script('flush');
  redis.disconnect();
}
