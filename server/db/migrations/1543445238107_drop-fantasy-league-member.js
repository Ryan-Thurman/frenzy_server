'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropTable('fantasyleaguemember', {
    cascade: true,
  });
};

exports.down = (pgm) => {
  pgm.createTable('fantasyleaguemember', {
    fantasyLeagueId: {
      type: 'int',
      primaryKey: true,
      notNull: true,
      references: 'fantasyleague(id)',
    },
    customerId: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      references: 'customer(id)',
    },
  });
};
