'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('fantasyleague', {
    currentpicknumber: {
      type: 'SMALLINT',
      default: 1,
    },
    pickorderfantasyteamids: 'INTEGER[]',
    currentpickindex: 'SMALLINT',
    timeperpick: 'INT',
    currentpickendsat: 'TIMESTAMP WITHOUT TIME ZONE',
  });
};
