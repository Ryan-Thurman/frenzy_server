'use strict';

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('enum_fantasy_league_state', [
    'preDraft',
    'cancelled',
    'drafting',
    'postDraft',
    'inProgress',
    'finalized',
  ]);

  pgm.addColumns('fantasyleague', {
    lasteventid: {
      type: 'uuid',
      references: 'draftevent(id)',
      onDelete: 'set null',
      onUpdate: 'cascade',
    },
    leaguestate: 'enum_fantasy_league_state',
    minteams: 'smallint',
  });

  pgm.createTrigger('draftevent', 'update_fantasy_league_last_event_id', {
    when: 'after',
    operation: 'insert',
    level: 'row',
    language: 'plpgsql',
  }, `
BEGIN
  UPDATE fantasyleague SET lasteventid = new.id WHERE fantasyleague.id = new.fantasyleagueid;
  RETURN new;
END;
  `);
};
