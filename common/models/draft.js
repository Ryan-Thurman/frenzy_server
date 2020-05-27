'use strict';

const _ = require('lodash');
const app = require('../../server/server');
const {promisify} = require('util');

const postgresDb = app.dataSources.postgresDb;
console.log(app.dataSources.postgresDb)
const query = promisify(postgresDb.connector.execute).bind(postgresDb.connector);

module.exports = function(Draft) {
  /** The socket.io namespace to use for the realtime draft api */
  Draft.IO_NAMESPACE = '/draft';

  /**
   * Creates a new Draft instance from the provided FantasyLeague
   * @param {FantasyLeague} fantasyLeague
   * @return {Promise<Draft>}
   */
  Draft.createFromFantasyLeague = async function(fantasyLeague) {
    const draftData = {
      fantasyLeagueId: fantasyLeague.id,
      fantasyLeague: fantasyLeague,
      currentPickNumber: fantasyLeague.currentPickNumber,
      currentPickingFantasyTeamId: fantasyLeague.currentPickingFantasyTeamId,
      timePerPick: fantasyLeague.timePerPick,
      currentPickStartsAt: fantasyLeague.currentPickStartsAt,
      currentPickEndsAt: fantasyLeague.currentPickEndsAt,
      lastEventId: fantasyLeague.lastEventId,
    };

    const draft = new Draft(draftData);

    // Populate teams
    const teams = await draft.teams();

    // Populate pick order
    draft.pickOrderFantasyTeamIds = _(teams)
      .sortBy(fantasyTeam => fantasyTeam.pickOrder)
      .map(fantasyTeam => fantasyTeam.id)
      .value();

    // Populate available players
    // All players in the allowed pro leagues who do not already belong to a fantasy team
    const availablePlayerIds = (await query(`
      SELECT pp.id FROM proplayer pp
      INNER JOIN fantasyleagueallowedproleague flpl
        ON flpl.proleagueid = pp.proleagueid
      LEFT JOIN fantasyteam ft
        ON ft.fantasyleagueid = flpl.fantasyleagueid
      LEFT JOIN fantasyteamplayer ftp
        ON ftp.fantasyteamid = ft.id
        AND ftp.proplayerid = pp.id
      WHERE flpl.fantasyleagueid = $1
        AND ftp.fantasyteamid IS NULL
    `.replace(/\s+/g, ' ').trim(), [fantasyLeague.id]))
      .map(record => record.id);
    draft.availableProPlayerIds = availablePlayerIds;

    return draft;
  };

  /**
   * @returns {Number} The time remaining (in ms) for the current pick round
   */
  Draft.prototype.getPickTimeRemaining = function() {
    return this.currentPickEndsAt - new Date();
  };
};
