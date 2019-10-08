'use strict';

module.exports = function(FantasyTeamPlayerProEventMeta) {
  FantasyTeamPlayerProEventMeta.validatesInclusionOf('position', {
    in: ['F', 'M', 'D', 'GK'],
    allowNull: true,
    allowBlank: true,
  });
};
