import type { CardPlayer } from './types';

export interface SchwimmenRoundInput {
  playerScores: Record<string, number>; // playerId -> score (0..31 or 33 for Feuer)
}

export interface SchwimmenRoundResult {
  updatedPlayers: CardPlayer[];
  losers: string[]; // playerIds of players who lost a life
  isFeuer: boolean;
  isGameOver: boolean;
  winner: CardPlayer | null;
}

export const processSchwimmenRound = (
  players: CardPlayer[],
  input: SchwimmenRoundInput,
): SchwimmenRoundResult => {
  const activePlayers = players.filter((p) => !p.isEliminated);
  if (activePlayers.length <= 1) {
    return {
      updatedPlayers: players,
      losers: [],
      isFeuer: false,
      isGameOver: true,
      winner: activePlayers[0] || null,
    };
  }

  // Check if anyone had 33 (Feuer / Blitz / 3 Asse)
  let feuerPlayerId: string | null = null;
  for (const p of activePlayers) {
    const val = input.playerScores[p.id];
    if (val >= 33) {
      feuerPlayerId = p.id;
      break;
    }
  }

  let losers: string[] = [];

  if (feuerPlayerId) {
    // Feuer: Everyone else loses a life!
    losers = activePlayers.filter((p) => p.id !== feuerPlayerId).map((p) => p.id);
  } else {
    // Find lowest score among active players
    let lowestScore = Infinity;
    for (const p of activePlayers) {
      const score = input.playerScores[p.id] !== undefined ? input.playerScores[p.id] : 0;
      if (score < lowestScore) {
        lowestScore = score;
      }
    }

    // All active players with lowest score lose a life
    losers = activePlayers
      .filter((p) => (input.playerScores[p.id] !== undefined ? input.playerScores[p.id] : 0) === lowestScore)
      .map((p) => p.id);
  }

  const updatedPlayers = players.map((player) => {
    if (player.isEliminated) return player;

    const roundScoreVal = input.playerScores[player.id] !== undefined ? input.playerScores[player.id] : 0;
    const didLose = losers.includes(player.id);

    if (!didLose) {
      return {
        ...player,
        roundScores: [...player.roundScores, roundScoreVal],
      };
    }

    // If currently swimming, losing means elimination (drowned)
    if (player.isSwimming) {
      return {
        ...player,
        isSwimming: false,
        isEliminated: true,
        lives: 0,
        roundScores: [...player.roundScores, roundScoreVal],
      };
    }

    // Normal life deduction
    const nextLives = player.lives - 1;
    if (nextLives <= 0) {
      return {
        ...player,
        lives: 0,
        isSwimming: true, // Now swimming!
        roundScores: [...player.roundScores, roundScoreVal],
      };
    }

    return {
      ...player,
      lives: nextLives,
      roundScores: [...player.roundScores, roundScoreVal],
    };
  });

  const remainingActive = updatedPlayers.filter((p) => !p.isEliminated);
  const isGameOver = remainingActive.length <= 1;
  const winner = isGameOver && remainingActive.length === 1 ? remainingActive[0] : null;

  return {
    updatedPlayers,
    losers,
    isFeuer: Boolean(feuerPlayerId),
    isGameOver,
    winner,
  };
};
