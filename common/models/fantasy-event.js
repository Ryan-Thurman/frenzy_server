'use strict';

const app = require('../../server/server');
const {maxBy} = require('lodash');

module.exports = FantasyEvent => {
  /**
   * If the event is completed, updates the event winner
   * to whichever team has scored more points
   * @returns {this}
   */
  FantasyEvent.prototype.updateWinner = async function() {
    // Do nothing if event is not yet completed
    if (new Date() < this.endDate) return this;

    const participatingTeams = await app.models.FantasyEventTeam.find({
      where: {fantasyEventId: this.id},
    });
    const winner = maxBy(participatingTeams, team => team.points);
    const winnerId = winner ? winner.fantasyTeamId : null;
    await this.updateAttribute('winnerId', winnerId);
    return this;
  };
};
