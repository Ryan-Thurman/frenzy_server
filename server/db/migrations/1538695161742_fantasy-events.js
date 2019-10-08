'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('enum_fantasy_league_duration', [
    'weekly',
    'half-season',
    'full-season',
    'custom',
  ]);

  pgm.alterColumn('fantasyleague', 'leagueduration', {
    type: 'enum_fantasy_league_duration',
    using: 'leagueduration::enum_fantasy_league_duration',
  });

  pgm.createType('enum_player_position', ['F', 'M', 'D', 'GK']);

  pgm.alterColumn('fantasyteamplayer', 'position', {
    type: 'enum_player_position',
    using: 'position::enum_player_position',
  });
  pgm.alterColumn('proplayer', 'position', {
    type: 'enum_player_position',
    using: 'position::enum_player_position',
  });

  pgm.createTable('proeventplayerstats', {
    proeventid: {
      type: 'integer',
      primaryKey: true,
      references: 'proevent(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    proplayerid: {
      type: 'integer',
      primaryKey: true,
      references: 'proplayer(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    minutesplayed: 'smallint',
    goals: 'smallint',
    owngoals: 'smallint',
    goalsallowed: 'smallint',
    penaltyshots: 'smallint',
    penaltygoals: 'smallint',
    clears: 'smallint',
    foulscommitted: 'smallint',
    assists: 'smallint',
    tackles: 'smallint',
    saves: 'smallint',
    keypasses: 'smallint',
    passesattempted: 'smallint',
    passescompleted: 'smallint',
    redcards: 'smallint',
    yellowcards: 'smallint',
    offsides: 'smallint',
    interceptions: 'smallint',
    blocks: 'smallint',
  });

  pgm.createTable('fantasyteamplayerproeventmeta', {
    fantasyteamid: {
      type: 'integer',
      primaryKey: true,
      references: 'fantasyteam(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    proplayerid: {
      type: 'integer',
      primaryKey: true,
      references: 'proplayer(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    proeventid: {
      type: 'integer',
      primaryKey: true,
      references: 'proevent(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    position: 'enum_player_position',
    positionOrder: 'smallint',
  });

  pgm.createTable('fantasyevent', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    fantasyleagueid: {
      type: 'integer',
      notNull: true,
      references: 'fantasyleague(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    startdate: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    enddate: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    round: 'smallint',
    winnerid: {
      type: 'integer',
      references: 'fantasyteam(id)',
      onDelete: 'set null',
      onUpdate: 'cascade',
    },
  });
  pgm.createIndex('fantasyevent', 'fantasyleagueid');
  pgm.createIndex('fantasyevent', 'startdate');
  pgm.createIndex('fantasyevent', 'winnerid');

  pgm.createTable('fantasyeventteam', {
    fantasyeventid: {
      type: 'integer',
      primaryKey: true,
      references: 'fantasyevent(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    fantasyteamid: {
      type: 'integer',
      primaryKey: true,
      references: 'fantasyteam(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
  });

  pgm.createTable('fantasyeventplayerstats', {
    fantasyeventid: {
      type: 'integer',
      primaryKey: true,
      references: 'fantasyevent(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    proplayerid: {
      type: 'integer',
      primaryKey: true,
      references: 'proplayer(id)',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    minutesplayed: 'smallint',
    proeventsplayed: 'smallint',
    minutesperproevent: 'float',
    points: 'numeric(8, 2)',
    goals: 'smallint',
    owngoals: 'smallint',
    goalsallowed: 'smallint',
    penaltyshots: 'smallint',
    penaltygoals: 'smallint',
    clears: 'smallint',
    foulscommitted: 'smallint',
    assists: 'smallint',
    tackles: 'smallint',
    saves: 'smallint',
    keypasses: 'smallint',
    passescompleted: 'smallint',
    passesattempted: 'smallint',
    passcompletionpercentage: 'float',
    redcards: 'smallint',
    yellowcards: 'smallint',
    offsides: 'smallint',
    interceptions: 'smallint',
    blocks: 'smallint',
    cleansheets: 'smallint',
  });
};

exports.down = pgm => {
  pgm.dropTable('fantasyeventplayerstats');
  pgm.dropTable('fantasyeventteam');
  pgm.dropTable('fantasyevent');
  pgm.dropTable('fantasyteamplayerproeventmeta');
  pgm.dropTable('proeventplayerstats');

  pgm.alterColumn('fantasyteamplayer', 'position', {
    type: 'string',
  });
  pgm.alterColumn('proplayer', 'position', {
    type: 'string',
  });
  pgm.dropType('enum_player_position');

  pgm.alterColumn('fantasyleague', 'leagueduration', {
    type: 'string',
  });
  pgm.dropType('enum_fantasy_league_duration');
};
