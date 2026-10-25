import { useCallback, useState } from 'react';
import { buildCompletedRoundInfo, type CompletedRoundInfo } from '../logic/completedRound';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

/** Wraps `submitGuess` and keeps the success-modal data for a correctly guessed round. */
export function useCompletedRound(
  game: GuessArtGameRecord | null,
  round: GuessArtRound | null,
  submitGuess: (guess: string) => Promise<{ correct: boolean }>,
  refresh: () => Promise<void>,
) {
  const [completed, setCompleted] = useState<CompletedRoundInfo | null>(null);
  const [open, setOpen] = useState(false);

  const handleGuessSubmit = async (guess: string) => {
    const info = buildCompletedRoundInfo(game, round, guess);
    const result = await submitGuess(guess);
    if (result.correct) {
      setCompleted(info);
      setOpen(true);
    }
    return result;
  };

  const handleNextRound = useCallback(async () => {
    setOpen(false);
    await refresh();
  }, [refresh]);

  return { completed, open, handleGuessSubmit, handleNextRound };
}
