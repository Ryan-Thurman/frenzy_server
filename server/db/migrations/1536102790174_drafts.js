'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('fantasyleague', {
    maxteams: 'smallint',
    playersperteam: {
      type: 'smallint',
      notNull: true,
      default: 17,
    },
    currentpickingfantasyteamid: {
      type: 'int',
      references: 'fantasyteam(id)',
      onDelete: 'set null',
      onUpdate: 'cascade',
    },
    currentpickstartsat: 'timestamp with time zone',
  });

  pgm.alterColumn('fantasyleague', 'currentpicknumber', {
    default: null,
  });

  pgm.dropColumns('fantasyleague', [
    'pickorderfantasyteamids',
    'currentpickindex',
  ]);

  pgm.addColumns('fantasyteam', {
    pickorder: 'smallint',
  });

  pgm.addIndex('fantasyteam', [
    'fantasyleagueid',
    'pickorder',
  ], {
    name: 'league_pick_order_unique_idx',
    unique: true,
  });
};
