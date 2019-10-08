'use strict';

const {promisify} = require('util');
const realtimeServer = require('../../server/lib/realtime-server');

module.exports = function(ProEvent) {
  // ProEvent.IO_NAMESPACE = '/pro-event';

  // realtimeServer.whenInitialized(io => {
  //   const proEventNamespace = io.of(ProEvent.IO_NAMESPACE);

  //   ProEvent.observe('after save', async context => {
  //     proEventNamespace.to(context.instance.id).emit('update', context.instance);
  //   });
  // });
};
