'use strict';

exports.up = (pgm) => {
  pgm.addColumn('fantasyeventteam', {
    points: 'numeric(8, 2)',
  });
};

