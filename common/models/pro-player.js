'use strict';

module.exports = function(ProPlayer) {
  ProPlayer.validatesInclusionOf('position', {in: ['F', 'M', 'D', 'GK']});
};
