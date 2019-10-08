'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('draftevent', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    eventname: {
      type: 'text',
      notNull: true,
      comment: 'Name of the event to which listeners will bind',
    },
    fantasyleagueid: {
      type: 'integer',
      notNull: true,
      references: 'fantasyleague(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
      comment: 'FantasyLeague.id to which this draft event belongs',
    },
    senderid: {
      type: 'uuid',
      notNull: false,
      references: 'customer(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
      comment: 'Customer.id of the user who sent this event, or NULL if it was a server-originated event',
    },
    at: {
      type: 'timestamp with time zone',
      notNull: true,
      comment: 'Date/timestamp with millisecond-level precision',
    },
    data: {
      type: 'jsonb',
      notNull: true,
      comment: 'Data payload, varies by event',
    },
  });

  pgm.createIndex('draftevent', 'fantasyleagueid');
  pgm.createIndex('draftevent', 'senderid');
  pgm.createIndex('draftevent', 'at');
};

exports.down = pgm => {
  pgm.dropTable('draftevent');
};
