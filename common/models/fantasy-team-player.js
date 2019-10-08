'use strict';

module.exports = function(FantasyTeamPlayer) {
  FantasyTeamPlayer.validatesInclusionOf('position', {
    in: ['F', 'M', 'D', 'GK'],
    allowNull: true,
    allowBlank: true,
  });
};
