'use strict';

module.exports = function(Lineup) {
  /**
   * Initializes the static Lineup records in memory
   */
  Lineup.populate = async function() {
    await Lineup.create([
      {
        id: 1,
        name: '3-4-3',
        defender: 3,
        midfielder: 4,
        forward: 3,
        goalkeeper: 1,
      },
      {
        id: 2,
        name: '4-3-3',
        defender: 4,
        midfielder: 3,
        forward: 3,
        goalkeeper: 1,
      },
      {
        id: 3,
        name: '4-4-2',
        defender: 4,
        midfielder: 4,
        forward: 2,
        goalkeeper: 1,
      },
    ]);
  };
};
