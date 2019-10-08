'use strict';

exports.up = pgm => {
  pgm.addColumn('fantasyleague', {
    dayofweek: 'smallint',
    seasonhalf: 'smallint',
  });
};
