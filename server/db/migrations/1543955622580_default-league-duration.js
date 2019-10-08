'use strict';

exports.up = (pgm) => {
  pgm.alterColumn('fantasyleague', 'leagueduration', {
    default: 'custom',
  });
};

exports.down = (pgm) => {
  pgm.alterColumn('fantasyleague', 'leagueduration', {
    default: null,
  });
};
