import { useEffect, useState } from 'react';
import type { GuessArtRound } from '../logic/types';
import type { LetterEntry } from '../components/HintLetterChips';

export function useGuessArtHints(currentRound: GuessArtRound | null, guess: string, setGuess: React.Dispatch<React.SetStateAction<string>>) {
  const [hintStage, setHintStage] = useState<number>(currentRound?.hintLevel || 0);
  const [hintLetters, setHintLetters] = useState<LetterEntry[]>([]);

  useEffect(() => {
    const level = currentRound?.hintLevel || 0;
    setHintStage(level);
    if (Array.isArray(currentRound?.hintLetters) && currentRound.hintLetters.length > 0) {
      setHintLetters(currentRound.hintLetters.map((letter, id) => ({ id, letter: letter.toUpperCase(), used: false })));
      if (level >= 2) {
        setGuess((prev) => {
          const pool = [...currentRound.hintLetters!].map((l) => l.toUpperCase());
          let filtered = '';
          for (const char of prev) {
            const upper = char.toUpperCase();
            const idx = pool.indexOf(upper);
            if (idx !== -1) {
              filtered += char;
              pool.splice(idx, 1);
            }
          }
          return filtered;
        });
      }
    }
  }, [currentRound?.hintLevel, currentRound?.hintLetters, setGuess]);

  useEffect(() => {
    if (hintStage >= 2 && Array.isArray(currentRound?.hintLetters) && currentRound.hintLetters.length > 0) {
      setHintLetters((prevLetters) => {
        const newLetters = prevLetters.map((l) => ({ ...l, used: false }));
        for (const char of guess) {
          const upper = char.toUpperCase();
          const idx = newLetters.findIndex((l) => !l.used && l.letter === upper);
          if (idx !== -1) newLetters[idx].used = true;
        }
        const hasChanged = prevLetters.some((p, i) => p.used !== newLetters[i]?.used);
        return hasChanged ? newLetters : prevLetters;
      });
    }
  }, [guess, currentRound?.hintLetters, hintStage]);

  return { hintStage, setHintStage, hintLetters, setHintLetters };
}
