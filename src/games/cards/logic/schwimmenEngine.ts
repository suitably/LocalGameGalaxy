import type { CardPlayer } from './types';

export interface SchwimmenRoundInput {
  playerScores?: Record<string, number>; // Optional backwards-compatible score map
  losers?: string[]; // Player IDs of players who directly lost a life this round
  blitzWinnerId?: string; // Player ID who called Blitz/Feuer (causes all other active players to lose a life)
}

export interface SchwimmenRoundResult {
  updatedPlayers: CardPlayer[];
  losers: string[]; // Player IDs of players who lost a life
  isFeuer: boolean;
  blitzWinnerId?: string;
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

  let losers: string[] = [];
  let isFeuer = false;
  let blitzWinnerId: string | undefined;

  // 1. Check if a Blitz winner is specified
  if (input.blitzWinnerId) {
    blitzWinnerId = input.blitzWinnerId;
    isFeuer = true;
    losers = activePlayers.filter((p) => p.id !== blitzWinnerId).map((p) => p.id);
  }
  // 2. Check if direct losers are specified
  else if (input.losers && input.losers.length > 0) {
    losers = activePlayers.filter((p) => input.losers!.includes(p.id)).map((p) => p.id);
  }
  // 3. Fallback to point evaluation if playerScores provided
  else if (input.playerScores) {
    const scores = input.playerScores;
    let feuerPlayerId: string | null = null;
    for (const p of activePlayers) {
      if ((scores[p.id] || 0) >= 33) {
        feuerPlayerId = p.id;
        break;
      }
    }

    if (feuerPlayerId) {
      blitzWinnerId = feuerPlayerId;
      isFeuer = true;
      losers = activePlayers.filter((p) => p.id !== feuerPlayerId).map((p) => p.id);
    } else {
      let lowestScore = Infinity;
      for (const p of activePlayers) {
        const s = scores[p.id] !== undefined ? scores[p.id] : 0;
        if (s < lowestScore) lowestScore = s;
      }
      losers = activePlayers
        .filter((p) => (scores[p.id] !== undefined ? scores[p.id] : 0) === lowestScore)
        .map((p) => p.id);
    }
  }

  const updatedPlayers = players.map((player) => {
    if (player.isEliminated) return player;

    const didLose = losers.includes(player.id);
    if (!didLose) {
      return {
        ...player,
        roundScores: [...player.roundScores, 0],
      };
    }

    // If currently swimming, losing means elimination (drowned)
    if (player.isSwimming) {
      return {
        ...player,
        isSwimming: false,
        isEliminated: true,
        lives: 0,
        roundScores: [...player.roundScores, -1],
      };
    }

    // Normal life deduction
    const nextLives = player.lives - 1;
    if (nextLives <= 0) {
      return {
        ...player,
        lives: 0,
        isSwimming: true, // Now swimming with swimming ring!
        roundScores: [...player.roundScores, -1],
      };
    }

    return {
      ...player,
      lives: nextLives,
      roundScores: [...player.roundScores, -1],
    };
  });

  const remainingActive = updatedPlayers.filter((p) => !p.isEliminated);
  const isGameOver = remainingActive.length <= 1;
  const winner = isGameOver && remainingActive.length === 1 ? remainingActive[0] : null;

  return {
    updatedPlayers,
    losers,
    isFeuer,
    blitzWinnerId,
    isGameOver,
    winner,
  };
};

/**
 * Helper to manually adjust a player's lives (e.g. +1 life undo or manual life change)
 */
export const adjustPlayerLives = (
  players: CardPlayer[],
  playerId: string,
  delta: number,
  maxLives = 3,
): CardPlayer[] => {
  return players.map((p) => {
    if (p.id !== playerId) return p;

    if (delta > 0) {
      // Regain life
      if (p.isEliminated) {
        return { ...p, isEliminated: false, isSwimming: true, lives: 0 };
      }
      if (p.isSwimming) {
        return { ...p, isSwimming: false, lives: 1 };
      }
      return { ...p, lives: Math.min(maxLives, p.lives + delta) };
    } else if (delta < 0) {
      // Lose life
      if (p.isEliminated) return p;
      if (p.isSwimming) {
        return { ...p, isSwimming: false, isEliminated: true, lives: 0 };
      }
      const nextLives = p.lives - 1;
      if (nextLives <= 0) {
        return { ...p, lives: 0, isSwimming: true };
      }
      return { ...p, lives: nextLives };
    }
    return p;
  });
};
