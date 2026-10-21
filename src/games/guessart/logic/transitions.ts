/**
 * Pure GuessArt state transitions [ID: LOGIC-GUESSART-TRANSITIONS]
 *
 * The engine loads records, calls these, and persists the result. No IndexedDB access here.
 */
import { evaluateGuess } from './guessEvaluator';
import type { GuessArtGameRecord, GuessArtRound } from './types';

export const EMPTY_CANVAS_SCENE = JSON.stringify({ elements: [], appState: {}, files: {} });

/**
 * Applies a guess to the active round. Throws outside the guessing phase.
 * From hint level 2 on only an exact match counts.
 */
export function applyGuess(
  game: Pick<GuessArtGameRecord, 'status'>,
  round: GuessArtRound,
  guess: string,
  now: Date,
): { correct: boolean; round: GuessArtRound } {
  if (game.status !== 'guessing') {
    throw new Error('Guess submission only allowed during guessing phase');
  }
  const correct = evaluateGuess(round.translations || {}, round.word, guess, {
    exactOnly: (round.hintLevel || 0) >= 2,
  });
  return {
    correct,
    round: {
      ...round,
      guesses: Array.isArray(round.guesses) ? [...round.guesses, guess] : [guess],
      guess: correct ? guess : round.guess,
      status: correct ? 'completed' : round.status,
      completedAt: correct ? now.toISOString() : round.completedAt,
    },
  };
}

/** Game after a correct guess: next round number, back to word selection, one more completed round. */
export function advanceAfterCorrectGuess(current: GuessArtGameRecord): GuessArtGameRecord {
  return {
    ...current,
    status: 'selecting',
    roundNumber: current.roundNumber + 1,
    currentPlayerIndex: current.currentPlayerIndex,
    statistics: {
      roundsCompleted: (current.statistics?.roundsCompleted || 0) + 1,
    },
  };
}

/** Fresh round for `game.roundNumber`, drawn by the current player, waiting for a word. */
export function createEmptyRound(
  game: GuessArtGameRecord,
  temporaryClaim: boolean,
): Partial<GuessArtRound> {
  return {
    roundNumber: game.roundNumber,
    drawnById: game.players[game.currentPlayerIndex]?.id,
    status: 'selecting',
    temporaryClaim,
    word: '',
    wordId: null,
    wordLanguageCode: game.options.language,
    wordDifficulty: 3,
    translations: {},
    guesses: [],
    hintLevel: 0,
    hintRequested: false,
    hintLetters: [],
    wordMask: [],
    wordLength: 0,
    canvasData: EMPTY_CANVAS_SCENE,
  };
}
