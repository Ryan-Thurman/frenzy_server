'use strict';

const {StatsEvent} = require('./stats-client');
const {set} = require('lodash');

module.exports = {
  pollEventBoxScores,
};

/**
 * Polls for new box scores for all events that are currently in progress
 * @param {Loopback.LoopbackApplication} app
 * @param {string|Date} [now] ISO string of the threshold before which games won't be polled.
 *   Leave blank to use the moment of execution, but it's injectable mainly for testing.
 * @return {Array<ProEvent>} ProEvents that were updated
 */
async function pollEventBoxScores(app, now = new Date()) {
  const {ProEvent, ProPlayer, ProEventPlayerStats} = app.models;

  const eventsInProgress = await ProEvent.find({
    where: {
      startDate: {lte: new Date(now)},
      boxDataConfirmed: false,
    },
    include: {
      relation: 'proLeague',
      scope: {
        fields: ['statsPath'],
      },
    },
  });

  const updatedProEvents = [];
  for (const proEvent of eventsInProgress) {
    const statsEvent = await StatsEvent.findOne(proEvent.proLeague().statsPath, proEvent.statsId);
    const updatedData = statsEvent.toProEventData();
    const updatedProEvent = await proEvent.updateAttributes(updatedData);
    updatedProEvents.push(updatedProEvent);

    // Update player stats
    const playerStatsByStatsId = {};
    for (const team of statsEvent.boxscores) {
      // Aggregate player data from a few different areas of the StatsEvent object
      for (const player of team.players) {
        set(playerStatsByStatsId, [player.player.playerId, 'playerData'], player);
      }
      for (const player of team.goaltenders) {
        set(playerStatsByStatsId, [player.player.playerId, 'goaltenderData'], player);
      }
      for (const player of team.benchPlayers) {
        set(playerStatsByStatsId, [player.player.playerId, 'benchPlayerData'], player);
      }
    }

    for (const [statsId, player] of Object.entries(playerStatsByStatsId)) {
      const proPlayer = await ProPlayer.findOne({where: {statsId: statsId}});

      const newPlayerStats = {
        proEventId: proEvent.id,
        proPlayerId: proPlayer.id,
      };

      if (player.playerData) {
        Object.assign(newPlayerStats, {
          minutesPlayed: player.playerData.minutesPlayed,
          goals: player.playerData.goals,
          ownGoals: player.playerData.ownGoals,
          penaltyShots: player.playerData.penaltyKicks.shots,
          penaltyGoals: player.playerData.penaltyKicks.goals,
          clears: player.playerData.clears,
          foulsCommitted: player.playerData.foulsCommitted,
          assists: player.playerData.assists,
          tackles: player.playerData.tackles,
          keyPasses: player.playerData.keyPasses,
          passesAttempted: player.playerData.touches.passes,
          passesCompleted: player.playerData.touches.completedPasses,
          redCards: player.playerData.redCards,
          yellowCards: player.playerData.yellowCards,
          offsides: player.playerData.offsides,
          interceptions: player.playerData.touches.interceptions,
          blocks: player.playerData.touches.blocks,
        });
      }

      if (player.goaltenderData) {
        Object.assign(newPlayerStats, {
          goalsAllowed: player.goaltenderData.goalsAllowed,
          saves: player.goaltenderData.saves,
        });
      }

      if (player.benchPlayerData) {
        Object.assign(newPlayerStats, {
          redCards: player.benchPlayerData.redCards,
          yellowCards: player.benchPlayerData.yellowCards,
        });
      }

      const playerStats = await ProEventPlayerStats.findOne({
        where: {
          proEventId: proEvent.id,
          proPlayerId: proPlayer.id,
        },
      });

      if (playerStats) {
        await playerStats.updateAttributes(newPlayerStats);
      } else {
        await ProEventPlayerStats.create(newPlayerStats);
      }
    }
  }

  return updatedProEvents;
}
