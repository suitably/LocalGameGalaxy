import type { GuessArtGameRecord, GuessArtRound } from './types';

/** Snapshot of a round taken right before the winning guess is submitted. */
export interface CompletedRoundInfo {
  word: string;
  originalWord?: string;
  originalLang?: string;
  guessesCount: number;
  roundNumber: number;
  guesses: string[];
  drawerName?: string;
  guesserName?: string;
}

/** Builds the data shown in the success modal for `guess` on the current round. */
export function buildCompletedRoundInfo(
  game: GuessArtGameRecord | null | undefined,
  round: GuessArtRound | null | undefined,
  guess: string,
): CompletedRoundInfo {
  const originalWord =
    (round?.translations &&
      round?.wordLanguageCode &&
      round.translations[round.wordLanguageCode]?.canonical) ||
    round?.word;
  const drawerName =
    game && round ? game.players.find((p) => p.id === round.drawnById)?.name : undefined;
  const guesserName =
    game && round
      ? round.guesserName ||
        game.players[
          (game.players.findIndex((p) => p.id === round.drawnById) + 1) % game.players.length
        ]?.name
      : undefined;
  return {
    word: round?.word || guess,
    originalWord,
    originalLang: round?.wordLanguageCode,
    guessesCount: (round?.guesses.length || 0) + 1,
    roundNumber: round?.roundNumber || 1,
    guesses: round?.guesses ? [...round.guesses, guess] : [guess],
    drawerName,
    guesserName,
  };
}
