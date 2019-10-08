'use strict';

exports.up = pgm => {
  pgm.addColumns('proevent', {
    statsrawperioddetailsdata: 'jsonb',
  });
};

