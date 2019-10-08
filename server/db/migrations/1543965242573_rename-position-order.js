'use strict';

exports.up = (pgm) => {
  pgm.renameColumn('fantasyteamplayerproeventmeta', 'positionOrder', 'positionorder');
};

exports.down = (pgm) => {
  pgm.renameColumn('fantasyteamplayerproeventmeta', 'positionorder', 'positionOrder');
};
