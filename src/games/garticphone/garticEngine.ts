import type { GarticBook, GarticGameState, GarticPlayer, GarticStep } from './types';
import { ensureUniquePlayerName } from '../../lib/disambiguateName';
import { generateUUID } from '../../lib/uuid';

export const createInitialGarticState = (
  hostId: string,
  hostName: string,
  roomId = Math.random().toString(36).substring(2, 6).toUpperCase(),
  initialPlayers?: GarticPlayer[],
  gameId?: string,
): GarticGameState => {
  const players = initialPlayers && initialPlayers.length > 0
    ? initialPlayers
    : [
        {
          id: hostId,
          name: hostName,
          isHost: true,
          ready: true,
        },
      ];

  const totalRounds = players.length;
  const books: GarticBook[] = players.map((p) => ({
    ownerId: p.id,
    ownerName: p.name,
    steps: [],
  }));

  const assignments: Record<string, string> = {};
  players.forEach((p) => {
    assignments[p.id] = p.id;
  });

  return {
    id: gameId || generateUUID(),
    roomId,
    hostId,
    phase: 'prompt',
    roundIndex: 0,
    totalRounds,
    players,
    books,
    assignments,
    currentRevealBookIndex: 0,
    currentRevealStepIndex: 0,
    settings: {
      drawTimeSeconds: 75,
      guessTimeSeconds: 35,
    },
  };
};

export const startGarticGame = (state: GarticGameState): GarticGameState => {
  if (state.players.length < 1) return state;

  const totalRounds = state.players.length;
  const books: GarticBook[] = state.players.map((p) => ({
    ownerId: p.id,
    ownerName: p.name,
    steps: [],
  }));

  const assignments: Record<string, string> = {};
  state.players.forEach((p) => {
    assignments[p.id] = p.id;
  });

  return {
    ...state,
    phase: 'prompt',
    roundIndex: 0,
    totalRounds,
    books,
    assignments,
    currentRevealBookIndex: 0,
    currentRevealStepIndex: 0,
  };
};

/**
 * Adds a new player seamlessly to an active or ongoing match without disturbing existing assignments.
 */
export const addPlayerToGarticGame = (
  state: GarticGameState,
  player: GarticPlayer,
): GarticGameState => {
  if (state.players.some((p) => p.id === player.id)) {
    return state;
  }

  const uniqueName = ensureUniquePlayerName(player.name, state.players, player.id);
  const newPlayer: GarticPlayer = {
    ...player,
    name: uniqueName,
  };

  const newBook: GarticBook = {
    ownerId: newPlayer.id,
    ownerName: newPlayer.name,
    steps: [],
  };

  const updatedPlayers = [...state.players, newPlayer];
  const updatedBooks = [...state.books, newBook];
  const updatedAssignments: Record<string, string> = {
    ...(state.assignments || {}),
    [newPlayer.id]: newPlayer.id,
  };

  return {
    ...state,
    players: updatedPlayers,
    books: updatedBooks,
    assignments: updatedAssignments,
    totalRounds: Math.max(state.totalRounds, updatedPlayers.length),
  };
};

/**
 * Returns the target book assigned to a specific player in the current round.
 */
export const getPlayerAssignedBook = (
  state: GarticGameState,
  playerId: string,
): GarticBook | null => {
  const assignedOwnerId = state.assignments?.[playerId] || playerId;
  const found = state.books.find((b) => b.ownerId === assignedOwnerId);
  if (found) return found;
  const pIndex = state.players.findIndex((p) => p.id === playerId);
  if (pIndex >= 0 && state.books[pIndex]) {
    return state.books[pIndex];
  }
  return state.books[0] || null;
};

/**
 * Checks if a specific player has submitted their step for the current round.
 * Robust check: checks if ANY step in ANY book has authorId === playerId and roundIndex === state.roundIndex.
 */
export const isPlayerFinishedCurrentRound = (
  state: GarticGameState,
  playerId: string,
): boolean => {
  return state.books.some((b) =>
    b.steps.some((s) => s.authorId === playerId && s.roundIndex === state.roundIndex),
  );
};

/**
 * Returns the assigned task for a specific player in the current round.
 */
export const getPlayerTaskForRound = (
  state: GarticGameState,
  playerId: string,
): {
  book: GarticBook | null;
  taskType: 'prompt' | 'drawing' | 'guessing' | 'waiting';
  previousStep: GarticStep | null;
  hasSubmitted: boolean;
} => {
  if (state.phase === 'lobby' || state.phase === 'reveal' || state.phase === 'finished') {
    return { book: null, taskType: 'waiting', previousStep: null, hasSubmitted: false };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return { book: null, taskType: 'waiting', previousStep: null, hasSubmitted: false };
  }

  const hasSubmitted = isPlayerFinishedCurrentRound(state, playerId);
  const book = getPlayerAssignedBook(state, playerId);
  if (!book) {
    return { book: null, taskType: 'waiting', previousStep: null, hasSubmitted };
  }

  if (hasSubmitted) {
    return { book, taskType: 'waiting', previousStep: null, hasSubmitted: true };
  }

  if (book.steps.length === 0) {
    return { book, taskType: 'prompt', previousStep: null, hasSubmitted: false };
  }

  const previousStep = book.steps[book.steps.length - 1];
  const taskType = previousStep.type === 'prompt' ? 'drawing' : 'guessing';
  return { book, taskType, previousStep, hasSubmitted: false };
};

/**
 * Submits a player's step and advances rounds/phase when all players have submitted.
 */
export const submitPlayerGarticStep = (
  state: GarticGameState,
  playerId: string,
  content: string,
): GarticGameState => {
  const { book, taskType, hasSubmitted } = getPlayerTaskForRound(state, playerId);
  if (!book || taskType === 'waiting' || hasSubmitted) return state;

  const player = state.players.find((p) => p.id === playerId);
  const stepType = taskType === 'drawing' ? 'drawing' : 'prompt';

  const newStep: GarticStep = {
    type: stepType,
    authorId: playerId,
    authorName: player?.name || 'Anonymous',
    content,
    timestamp: Date.now(),
    roundIndex: state.roundIndex,
  };

  const updatedBooks = state.books.map((b) =>
    b.ownerId === book.ownerId ? { ...b, steps: [...b.steps, newStep] } : b,
  );

  const tempState: GarticGameState = {
    ...state,
    books: updatedBooks,
  };

  // Check if all players have completed their task for this round
  const allCompleted = state.players.every((p) =>
    isPlayerFinishedCurrentRound(tempState, p.id),
  );

  if (allCompleted) {
    const nextRoundIndex = state.roundIndex + 1;
    if (nextRoundIndex >= state.totalRounds) {
      // Game completed, go to Reveal phase!
      return {
        ...state,
        books: updatedBooks,
        phase: 'reveal',
        roundIndex: nextRoundIndex,
        currentRevealBookIndex: 0,
        currentRevealStepIndex: 0,
      };
    }

    // Rotate assignments among all active players
    const nextAssignments: Record<string, string> = {};
    const numPlayers = state.players.length;
    state.players.forEach((p, idx) => {
      const prevPlayer = state.players[(idx - 1 + numPlayers) % numPlayers];
      const prevBookOwner = state.assignments?.[prevPlayer.id] || prevPlayer.id;
      nextAssignments[p.id] = prevBookOwner;
    });

    return {
      ...state,
      books: updatedBooks,
      assignments: nextAssignments,
      roundIndex: nextRoundIndex,
      phase: 'drawing',
    };
  }

  return tempState;
};
