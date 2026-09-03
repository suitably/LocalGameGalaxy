/**
 * useWordle.ts - React Hook Managing Wordle Game State & Persistence
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { wordleEngine } from '../logic/wordleEngine';
import {
  getTodayDateKey,
  loadDailyGameState,
  saveDailyGameState,
  loadWordleStats,
  saveWordleStats,
} from '../logic/wordleStorage';
import type { LetterStatus, WordleGameMode, WordleState, WordleStats } from '../logic/types';

export function useWordle(language = 'de', initialMode: WordleGameMode = 'daily', customWord?: string | null) {
  const [stats, setStats] = useState<WordleStats>(() => loadWordleStats());
  const [justFinished, setJustFinished] = useState(false);

  // Cached state for practice mode so switching between modes doesn't lose practice progress
  const practiceStateRef = useRef<WordleState | null>(null);

  const [state, setState] = useState<WordleState>(() => {
    const mode = customWord ? 'duel' : initialMode;
    const dateKey = getTodayDateKey();

    if (mode === 'duel' && customWord) {
      return {
        targetWord: customWord.toUpperCase(),
        guesses: [],
        evaluations: [],
        currentInput: '',
        status: 'playing',
        mode: 'duel',
        dateKey,
        invalidWordShake: false,
        message: null,
      };
    }

    if (mode === 'daily') {
      return loadDailyGameState(language, dateKey);
    }

    return {
      targetWord: wordleEngine.getRandomTargetWord(language),
      guesses: [],
      evaluations: [],
      currentInput: '',
      status: 'playing',
      mode: 'practice',
      dateKey,
      invalidWordShake: false,
      message: null,
    };
  });

  // Save daily game state to localStorage whenever it changes
  useEffect(() => {
    if (state.mode === 'daily') {
      saveDailyGameState(language, state.dateKey, {
        guesses: state.guesses,
        evaluations: state.evaluations,
        status: state.status,
      });
    }
  }, [state.guesses, state.evaluations, state.status, state.mode, state.dateKey, language]);

  // Save stats to localStorage whenever stats change
  useEffect(() => {
    saveWordleStats(stats);
  }, [stats]);

  // Handle language change: adjust state if language prop changed
  const [prevLanguage, setPrevLanguage] = useState(language);
  if (prevLanguage !== language) {
    setPrevLanguage(language);
    if (state.mode === 'daily') {
      setState(loadDailyGameState(language, getTodayDateKey()));
    }
  }

  // Check if date changed (e.g. past midnight) when window regains visibility/focus
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && state.mode === 'daily') {
        const today = getTodayDateKey();
        if (state.dateKey !== today) {
          setState(loadDailyGameState(language, today));
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleVisibilityOrFocus);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleVisibilityOrFocus);
      }
    };
  }, [state.mode, state.dateKey, language]);

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
        setJustFinished(true);
        setStats((prevStats) => {
          // Prevent double-counting if daily game on this dateKey was already recorded
          if (prev.mode === 'daily' && prevStats.lastCompletedDate === prev.dateKey) {
            return prevStats;
          }
          return wordleEngine.updateStats(
            prevStats,
            won,
            newGuesses.length,
            prev.mode === 'daily' ? prev.dateKey : undefined
          );
        });
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

  const switchMode = useCallback(
    (newMode: WordleGameMode) => {
      setJustFinished(false);
      setState((prev) => {
        if (prev.mode === newMode) {
          // If already in daily mode, check if date rolled over past midnight
          if (newMode === 'daily') {
            const today = getTodayDateKey();
            if (prev.dateKey !== today) {
              return loadDailyGameState(language, today);
            }
          }
          return prev;
        }

        // Cache practice state if switching away from practice
        if (prev.mode === 'practice') {
          practiceStateRef.current = prev;
        }

        if (newMode === 'daily') {
          const today = getTodayDateKey();
          return loadDailyGameState(language, today);
        }

        if (newMode === 'practice') {
          // Restore cached in-progress practice state if available
          if (practiceStateRef.current && practiceStateRef.current.status === 'playing') {
            return practiceStateRef.current;
          }
          // Otherwise start a new practice game
          return {
            targetWord: wordleEngine.getRandomTargetWord(language),
            guesses: [],
            evaluations: [],
            currentInput: '',
            status: 'playing',
            mode: 'practice',
            dateKey: getTodayDateKey(),
            invalidWordShake: false,
            message: null,
          };
        }

        return prev;
      });
    },
    [language]
  );

  const startNewGame = useCallback(
    (mode: WordleGameMode = 'practice', customWord?: string) => {
      setJustFinished(false);
      const today = getTodayDateKey();

      if (mode === 'duel' && customWord) {
        setState({
          targetWord: customWord.toUpperCase(),
          guesses: [],
          evaluations: [],
          currentInput: '',
          status: 'playing',
          mode: 'duel',
          dateKey: today,
          invalidWordShake: false,
          message: null,
        });
      } else if (mode === 'daily') {
        // NEVER overwrite today's daily puzzle if one exists!
        // Load current daily state for today
        setState(loadDailyGameState(language, today));
      } else {
        // Practice mode: generate new target word
        const target = wordleEngine.getRandomTargetWord(language);
        const newState: WordleState = {
          targetWord: target,
          guesses: [],
          evaluations: [],
          currentInput: '',
          status: 'playing',
          mode: 'practice',
          dateKey: today,
          invalidWordShake: false,
          message: null,
        };
        practiceStateRef.current = newState;
        setState(newState);
      }
    },
    [language]
  );

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
    justFinished,
    addLetter,
    removeLetter,
    submitGuess,
    switchMode,
    startNewGame,
    clearShake,
  };
}
