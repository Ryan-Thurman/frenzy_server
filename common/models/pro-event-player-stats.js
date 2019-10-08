'use strict';

const {handleChangedProEventPlayerStats} = require('../../server/lib/fantasy-league/fantasy-stats-aggregator');

module.exports = ProEventPlayerStats => {
  ProEventPlayerStats.observe('after save', async ctx => {
    if (ctx.instance) {
      await handleChangedProEventPlayerStats(ctx.instance);
    }
  });
};
