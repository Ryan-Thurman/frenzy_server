'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('proeventplayerstats', {
    updatedat: 'timestamp with time zone',
    createdat: 'timestamp with time zone',
  });
  pgm.addColumn('fantasyteamplayerproeventmeta', {
    updatedat: 'timestamp with time zone',
    createdat: 'timestamp with time zone',
  });
};
