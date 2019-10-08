'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('fantasyteamwatchlist', {
    fantasyteamid: {
      type: 'integer',
      primaryKey: true,
      references: 'fantasyteam(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    proplayerid: {
      type: 'integer',
      primaryKey: true,
      references: 'proplayer(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    order: {
      type: 'integer',
    },
  });

  pgm.createIndex('fantasyteamwatchlist', 'order');
};
