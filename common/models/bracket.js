'use strict';

const app = require('../../server/server');
const debug = require('debug')('frenzy:models:bracket');
const ValidateBracket = require('../../server/lib/bracket/validate-bracket');
const SeedBracket = require('../../server/lib/bracket/seed-bracket');
const {bracketIsCompleteForRound} = require('../../server/lib/bracket/bracket-completion');
const transientDS = app.dataSources.transient;

module.exports = function(Bracket) {
  // #region BracketTeamPick

  const bracketTeamPickProps = {
    proTeamId: Number,
    name: String,
  };
  const bracketTeamPickOptions = {
    idInjection: false,
    relations: {
      proTeam: {
        type: 'belongsTo',
        model: 'ProTeam',
        foreignKey: 'proTeamId',
      },
    },
  };

  /**
   * @class BracketTeamPick
   * @description A pointer to a team for use in the bracket, with the denormalized team name
   */
  const BracketTeamPick = transientDS.define('BracketTeamPick', bracketTeamPickProps, bracketTeamPickOptions);
  app.model(BracketTeamPick);

  /**
   * Creates an instance pointing to the given proTeam
   * @static
   * @param {ProTeam} proTeam
   * @return {BracketTeamPick}
   */
  BracketTeamPick.buildFromProTeam = function(proTeam) {
    return new BracketTeamPick({
      name: proTeam.name,
      proTeamId: proTeam.id,
    });
  };

  /**
   * Creates a duplicate instance
   * @return {BracketTeamPick}
   */
  BracketTeamPick.prototype.clone = function() {
    return new BracketTeamPick(this.toObject());
  };

  // #endregion

  // #region BracketPicks

  const bracketPicksProps = {
    groups: {
      a: [BracketTeamPick],
      b: [BracketTeamPick],
      c: [BracketTeamPick],
      d: [BracketTeamPick],
      e: [BracketTeamPick],
      f: [BracketTeamPick],
      g: [BracketTeamPick],
      h: [BracketTeamPick],
    },
    roundOf16: {
      ab: BracketTeamPick,
      cd: BracketTeamPick,
      ef: BracketTeamPick,
      gh: BracketTeamPick,
      ba: BracketTeamPick,
      dc: BracketTeamPick,
      fe: BracketTeamPick,
      hg: BracketTeamPick,
    },
    quarterfinal: {
      abcd: BracketTeamPick,
      efgh: BracketTeamPick,
      badc: BracketTeamPick,
      fehg: BracketTeamPick,
    },
    semifinal: {
      abcdefgh: BracketTeamPick,
      badcfehg: BracketTeamPick,
    },
    final: BracketTeamPick,
    thirdPlace: BracketTeamPick,
  };
  const bracketPicksOptions = {
    idInjection: false,
  };
  const BracketPicks = transientDS.define('BracketPicks', bracketPicksProps, bracketPicksOptions);

  // #endregion

  // #region BracketValidPicks

  const bracketValidPicksProps = {
    groups: {
      a: [BracketTeamPick],
      b: [BracketTeamPick],
      c: [BracketTeamPick],
      d: [BracketTeamPick],
      e: [BracketTeamPick],
      f: [BracketTeamPick],
      g: [BracketTeamPick],
      h: [BracketTeamPick],
    },
    roundOf16: {
      ab: [BracketTeamPick],
      cd: [BracketTeamPick],
      ef: [BracketTeamPick],
      gh: [BracketTeamPick],
      ba: [BracketTeamPick],
      dc: [BracketTeamPick],
      fe: [BracketTeamPick],
      hg: [BracketTeamPick],
    },
    quarterfinal: {
      abcd: [BracketTeamPick],
      efgh: [BracketTeamPick],
      badc: [BracketTeamPick],
      fehg: [BracketTeamPick],
    },
    semifinal: {
      abcdefgh: [BracketTeamPick],
      badcfehg: [BracketTeamPick],
    },
    final: [BracketTeamPick],
    thirdPlace: [BracketTeamPick],
  };
  const bracketValidPicksOptions = {
    idInjection: false,
  };
  const BracketValidPicks = transientDS.define('BracketValidPicks', bracketValidPicksProps, bracketValidPicksOptions);

  // #endregion

  // #region Defaults
  Bracket.definition.rawProperties.picks.default =
  Bracket.definition.properties.picks.default = function() {
    return new BracketPicks();
  };

  Bracket.definition.rawProperties.validPicks.default =
  Bracket.definition.properties.validPicks.default = function() {
    return new BracketValidPicks();
  };

  Bracket.observe('before save', async ctx => {
    if (!ctx.instance) return;

    if (!ctx.instance.picks) {
      ctx.instance.picks = new BracketPicks({
        final: null,
        thirdPlace: null,
      });
    }

    if (!ctx.instance.picks.groups) {
      ctx.instance.picks.groups = {
        a: [],
        b: [],
        c: [],
        d: [],
        e: [],
        f: [],
        g: [],
        h: [],
      };
    }

    if (!ctx.instance.picks.roundOf16) {
      ctx.instance.picks.roundOf16 = {
        ab: null,
        cd: null,
        ef: null,
        gh: null,
        ba: null,
        dc: null,
        fe: null,
        hg: null,
      };
    }

    if (!ctx.instance.picks.quarterfinal) {
      ctx.instance.picks.quarterfinal = {
        abcd: null,
        efgh: null,
        badc: null,
        fehg: null,
      };
    }

    if (!ctx.instance.picks.semifinal) {
      ctx.instance.picks.semifinal = {
        abcdefgh: null,
        badcfehg: null,
      };
    }

    if (!ctx.instance.validPicks) {
      ctx.instance.validPicks = new BracketValidPicks({
        final: [],
        thirdPlace: [],
      });
    }

    if (!ctx.instance.validPicks.groups) {
      ctx.instance.validPicks.groups = {
        a: [],
        b: [],
        c: [],
        d: [],
        e: [],
        f: [],
        g: [],
        h: [],
      };
    }

    if (!ctx.instance.validPicks.roundOf16) {
      ctx.instance.validPicks.roundOf16 = {
        ab: [],
        cd: [],
        ef: [],
        gh: [],
        ba: [],
        dc: [],
        fe: [],
        hg: [],
      };
    }

    if (!ctx.instance.validPicks.quarterfinal) {
      ctx.instance.validPicks.quarterfinal = {
        abcd: [],
        efgh: [],
        badc: [],
        fehg: [],
      };
    }

    if (!ctx.instance.validPicks.semifinal) {
      ctx.instance.validPicks.semifinal = {
        abcdefgh: [],
        badcfehg: [],
      };
    }
  });
  // #endregion

  // #region Validation
  Bracket.observe('before save', async ctx => {
    if (!ctx.instance) return;
    const bracket = ctx.instance;

    // Validate groups
    const {ProLeague} = app.models;
    const worldCupLeague = await ProLeague.findOne({
      include: 'proTeams',
      where: {statsPath: 'natl'},
    });

    if (!worldCupLeague) return;

    const worldCupTeams = worldCupLeague.proTeams();
    const groupsPicksValidationResult = ValidateBracket.validateGroupsPicks(bracket, worldCupTeams);
    debug(groupsPicksValidationResult);
    groupsPicksValidationResult.throwIfInvalid(422);

    // Validate other rounds
    for (const roundName of ['roundOf16', 'quarterfinal', 'semifinal']) {
      const validationResult = ValidateBracket.validateRoundPicks(roundName, bracket);
      debug(validationResult);
      validationResult.throwIfInvalid(422);
    }

    // Validate last rounds
    for (const roundName of ['final', 'thirdPlace']) {
      const validationResult = ValidateBracket.validateLastRoundPicks(roundName, bracket);
      debug(validationResult);
      validationResult.throwIfInvalid(422);
    }
  });
  // #endregion

  // #region Populate validPicks
  Bracket.observe('before save', async ctx => {
    const {ProLeague} = app.models;

    if (ctx.instance) {
      const bracket = ctx.instance;

      // Quick hack, fill in the required field to appease validations
      if (!bracket.updatedAt) bracket.updatedAt = new Date();

      // Check validity of model
      if (!bracket.isValid()) return;
      if (!bracket.picks.isValid()) return;

      const worldCupLeague = await ProLeague.findOne({
        include: 'proTeams',
        where: {statsPath: 'natl'},
      });

      if (!worldCupLeague) return;

      const worldCupTeams = worldCupLeague.proTeams();

      SeedBracket.seedGroups(bracket, worldCupTeams);

      if (bracket.picks.groups.isValid() && bracketIsCompleteForRound(bracket, 'groups')) {
        SeedBracket.seedRoundOf16(bracket);
      }
      if (bracket.picks.roundOf16.isValid() && bracketIsCompleteForRound(bracket, 'roundOf16')) {
        SeedBracket.seedQuarterfinal(bracket);
      }
      if (bracket.picks.quarterfinal.isValid() && bracketIsCompleteForRound(bracket, 'quarterfinal')) {
        SeedBracket.seedSemifinal(bracket);
      }
      if (bracket.picks.semifinal.isValid() && bracketIsCompleteForRound(bracket, 'semifinal')) {
        SeedBracket.seedFinal(bracket);
        SeedBracket.seedThirdPlace(bracket);
      }
    }
  });
  // #endregion

  // #region Populate isComplete
  Bracket.observe('before save', async ctx => {
    if (!ctx.instance) return;
    const bracket = ctx.instance;
    const allRoundsAreComplete =
      bracket.picks.groups.isValid() && bracketIsCompleteForRound(bracket, 'groups') &&
      bracket.picks.roundOf16.isValid() && bracketIsCompleteForRound(bracket, 'roundOf16') &&
      bracket.picks.quarterfinal.isValid() && bracketIsCompleteForRound(bracket, 'quarterfinal') &&
      bracket.picks.semifinal.isValid() && bracketIsCompleteForRound(bracket, 'semifinal') &&
      bracket.picks.final.isValid() && bracketIsCompleteForRound(bracket, 'final') &&
      bracket.picks.thirdPlace.isValid() && bracketIsCompleteForRound(bracket, 'thirdPlace');

    bracket.isComplete = allRoundsAreComplete;
  });
  // #endregion

  // #region Restrict accession after submission
  /*
  Bracket.beforeRemote('replaceOrCreate', throwIfSubmitted);
  Bracket.beforeRemote('upsert', throwIfSubmitted);
  Bracket.beforeRemote('deleteById', throwIfSubmitted);
  Bracket.beforeRemote('updateAll', throwIfSubmitted);
  Bracket.beforeRemote('replaceById', throwIfSubmitted);
  Bracket.beforeRemote('prototype.patchAttributes', throwIfSubmitted);
  Bracket.beforeRemote('createChangeStream', throwIfSubmitted);
  Bracket.beforeRemote('upsertWithWhere', throwIfSubmitted);

  function throwIfSubmitted(ctx, instance, next) {
    console.log(instance);
    if (instance && instance.submitted) {
      const err = new Error('Submitted bracket is read-only');
      err.status = 403;
      next(err);
    }
    next();
  }
  */
  // #endregion
};
