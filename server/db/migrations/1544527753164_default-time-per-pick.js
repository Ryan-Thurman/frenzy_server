'use strict';

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE fantasyleague
    SET timeperpick = 30
    WHERE timeperpick IS NULL
  `);

  pgm.alterColumn('fantasyleague', 'timeperpick', {
    notNull: true,
    default: 30,
  });
};

exports.down = (pgm) => {
  pgm.alterColumn('fantasyleague', 'timeperpick', {
    notNull: false,
    default: null,
  });
};
