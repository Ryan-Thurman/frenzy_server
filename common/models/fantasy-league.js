'use strict';

const app = require('../../server/server');

module.exports = async function(FantasyLeague) {
  FantasyLeague.LEAGUE_STATE = {
    PRE_DRAFT: 'preDraft',
    CANCELLED: 'cancelled',
    DRAFTING: 'drafting',
    POST_DRAFT: 'postDraft',
    IN_PROGRESS: 'inProgress',
    FINALIZED: 'finalized',
  };
  FantasyLeague.validatesInclusionOf('leagueState', {in: Object.values(FantasyLeague.LEAGUE_STATE)});

  FantasyLeague.LEAGUE_DURATION = {
    WEEKLY: 'weekly',
    HALF_SEASON: 'half-season',
    FULL_SEASON: 'full-season',
    CUSTOM: 'custom',
  };
  FantasyLeague.validatesInclusionOf('leagueDuration', {
    in: Object.values(FantasyLeague.LEAGUE_DURATION),
    allowNull: true,
    allowBlank: true,
  });

  FantasyLeague.validate('timePerPick', function(err) {
    if (this.timePerPick !== null && this.timePerPick <= 0) err();
  }, {message: ' should be a positive integer'});

  /**
   * Builds the draft object for API output with all associated
   * @return {object}
   */
  FantasyLeague.prototype.getDraft = async function() {
    const draft = await app.models.Draft.createFromFantasyLeague(this);
    const draftJSON = draft.toJSON();
    draftJSON.currentPickTimeRemaining = draft.getPickTimeRemaining();
    draftJSON.fantasyLeague = this;
    draftJSON.availablePlayers = await draft.availablePlayers({});
    draftJSON.teams = await draft.teams({
      include: [{
        fantasyTeamPlayers: ['proPlayer'],
      }],
    });
    draftJSON.lastEventId = this.lastEventId;
    return draftJSON;
  };

  /**
   * Determines whether the league has enough players to start the draft
   * @return {Promise<boolean>}
   */
  FantasyLeague.prototype.hasEnoughPlayers = async function() {
    const {FantasyTeam} = app.models;

    const numberOfTeams = await FantasyTeam.count({
      fantasyLeagueId: this.id,
      // @todo Figure out if readyForPlay is really needed,
      // and if so, what I was going to use it for
      // readyForPlay: true,
    });

    return numberOfTeams >= this.minTeams;
  };
};
