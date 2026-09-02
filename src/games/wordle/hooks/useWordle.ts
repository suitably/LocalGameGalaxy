/**
 * useWordle.ts - React Hook Managing Wordle Game State & Persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { wordleEngine } from '../logic/wordleEngine';
import type { LetterStatus, WordleGameMode, WordleState, WordleStats } from '../logic/types';

const STATS_STORAGE_KEY = 'galaxy_wordle_stats';
const DAILY_STORAGE_PREFIX = 'galaxy_wordle_daily_';

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useWordle(language = 'de', initialMode: WordleGameMode = 'daily', customWord?: string | null) {
  const dateKey = getTodayDateKey();

  const [stats, setStats] = useState<WordleStats>(() => {
    try {
      const raw = localStorage.getItem(STATS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : wordleEngine.getInitialStats();
    } catch {
      return wordleEngine.getInitialStats();
    }
  });

  const [state, setState] = useState<WordleState>(() => {
    const mode = customWord ? 'duel' : initialMode;
    let target = '';

    if (mode === 'duel' && customWord) {
      target = customWord.toUpperCase();
    } else if (mode === 'daily') {
      target = wordleEngine.getDailyTargetWord(language, dateKey);

      // Check if daily game is already saved in localStorage
      try {
        const saved = localStorage.getItem(`${DAILY_STORAGE_PREFIX}${language}_${dateKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            targetWord: target,
            guesses: parsed.guesses || [],
            evaluations: parsed.evaluations || [],
            currentInput: '',
            status: parsed.status || 'playing',
            mode: 'daily',
            dateKey,
            invalidWordShake: false,
            message: null,
          };
        }
      } catch {
        // Fallback to fresh state
      }
    } else {
      target = wordleEngine.getRandomTargetWord(language);
    }

    return {
      targetWord: target,
      guesses: [],
      evaluations: [],
      currentInput: '',
      status: 'playing',
      mode,
      dateKey,
      invalidWordShake: false,
      message: null,
    };
  });

  // Save daily game state to localStorage
  useEffect(() => {
    if (state.mode === 'daily') {
      try {
        localStorage.setItem(
          `${DAILY_STORAGE_PREFIX}${language}_${state.dateKey}`,
          JSON.stringify({
            guesses: state.guesses,
            evaluations: state.evaluations,
            status: state.status,
          })
        );
      } catch {
        // Ignore quota error
      }
    }
  }, [state.guesses, state.evaluations, state.status, state.mode, state.dateKey, language]);

  // Save stats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Ignore quota error
    }
  }, [stats]);

  const addLetter = useCallback((letter: string) => {
    setState((prev) => {
      if (prev.status !== 'playing' || prev.currentInput.length >= 5) {
        return prev;
      }
      const cleanChar = letter.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 1);
      if (!cleanChar) return prev;
      return {
        ...prev,
        currentInput: prev.currentInput + cleanChar,
        message: null,
      };
    });
  }, []);

  const removeLetter = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing' || prev.currentInput.length === 0) {
        return prev;
      }
      return {
        ...prev,
        currentInput: prev.currentInput.slice(0, -1),
        message: null,
      };
    });
  }, []);

  const submitGuess = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'playing') return prev;

      if (prev.currentInput.length !== 5) {
        return {
          ...prev,
          invalidWordShake: true,
          message: 'wordle.not_enough_letters',
        };
      }

      const guess = prev.currentInput.toUpperCase();
      const evaluation = wordleEngine.evaluateGuess(guess, prev.targetWord);
      const newGuesses = [...prev.guesses, guess];
      const newEvaluations = [...prev.evaluations, evaluation];

      const won = guess === prev.targetWord;
      const lost = !won && newGuesses.length >= 6;
      const newStatus = won ? 'won' : lost ? 'lost' : 'playing';

      if (newStatus !== 'playing') {
        setStats((prevStats) =>
          wordleEngine.updateStats(prevStats, won, newGuesses.length, prev.mode === 'daily' ? prev.dateKey : undefined)
        );
      }

      return {
        ...prev,
        guesses: newGuesses,
        evaluations: newEvaluations,
        currentInput: '',
        status: newStatus,
        invalidWordShake: false,
        message: won ? 'wordle.congratulations' : lost ? 'wordle.game_over' : null,
      };
    });
  }, []);

  const startNewGame = useCallback((mode: WordleGameMode = 'practice', customWord?: string) => {
    const today = getTodayDateKey();
    let target = '';

    if (mode === 'duel' && customWord) {
      target = customWord.toUpperCase();
    } else if (mode === 'daily') {
      target = wordleEngine.getDailyTargetWord(language, today);
    } else {
      target = wordleEngine.getRandomTargetWord(language);
    }

    setState({
      targetWord: target,
      guesses: [],
      evaluations: [],
      currentInput: '',
      status: 'playing',
      mode,
      dateKey: today,
      invalidWordShake: false,
      message: null,
    });
  }, [language]);

  const clearShake = useCallback(() => {
    setState((prev) => (prev.invalidWordShake ? { ...prev, invalidWordShake: false } : prev));
  }, []);

  const keyStatuses: Record<string, LetterStatus> = useMemo(() => {
    return wordleEngine.getKeyStatuses(state.evaluations);
  }, [state.evaluations]);

  return {
    state,
    stats,
    keyStatuses,
    addLetter,
    removeLetter,
    submitGuess,
    startNewGame,
    clearShake,
  };
}
