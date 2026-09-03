import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import {
  getTodayDateKey,
  normalizeWordleLang,
  getDailyStorageKey,
  loadDailyGameState,
  saveDailyGameState,
  loadWordleStats,
  saveWordleStats,
  DAILY_STORAGE_PREFIX,
} from './wordleStorage';
import { wordleEngine } from './wordleEngine';

describe('wordleStorage', () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    const mockStorage: Storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
      length: 0,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    store = {};
    vi.restoreAllMocks();
  });

  describe('getTodayDateKey', () => {
    it('formats a date as YYYY-MM-DD', () => {
      const testDate = new Date(2026, 8, 3); // 2026-09-03
      expect(getTodayDateKey(testDate)).toBe('2026-09-03');
    });

    it('pads single-digit month and day with zero', () => {
      const testDate = new Date(2026, 0, 5); // 2026-01-05
      expect(getTodayDateKey(testDate)).toBe('2026-01-05');
    });
  });

  describe('normalizeWordleLang & getDailyStorageKey', () => {
    it('normalizes german language variants to "de"', () => {
      expect(normalizeWordleLang('de')).toBe('de');
      expect(normalizeWordleLang('de-DE')).toBe('de');
      expect(normalizeWordleLang('de-AT')).toBe('de');
    });

    it('normalizes english and other language variants to "en"', () => {
      expect(normalizeWordleLang('en')).toBe('en');
      expect(normalizeWordleLang('en-US')).toBe('en');
      expect(normalizeWordleLang('fr')).toBe('en');
    });

    it('constructs predictable localStorage key', () => {
      expect(getDailyStorageKey('de', '2026-09-03')).toBe(`${DAILY_STORAGE_PREFIX}de_2026-09-03`);
      expect(getDailyStorageKey('en-US', '2026-09-03')).toBe(`${DAILY_STORAGE_PREFIX}en_2026-09-03`);
    });
  });

  describe('loadDailyGameState & saveDailyGameState', () => {
    it('returns fresh state when no saved game exists for the date', () => {
      const dateKey = '2026-09-03';
      const state = loadDailyGameState('de', dateKey);

      expect(state.mode).toBe('daily');
      expect(state.dateKey).toBe(dateKey);
      expect(state.status).toBe('playing');
      expect(state.guesses).toEqual([]);
      expect(state.evaluations).toEqual([]);
      expect(state.message).toBeNull();
      expect(state.targetWord).toBe(wordleEngine.getDailyTargetWord('de', dateKey));
    });

    it('persists and restores in-progress guesses and evaluations', () => {
      const dateKey = '2026-09-03';
      const guesses = ['APFEL', 'TRAUM'];
      const evaluations = [
        wordleEngine.evaluateGuess('APFEL', wordleEngine.getDailyTargetWord('de', dateKey)),
        wordleEngine.evaluateGuess('TRAUM', wordleEngine.getDailyTargetWord('de', dateKey)),
      ];

      saveDailyGameState('de', dateKey, {
        guesses,
        evaluations,
        status: 'playing',
      });

      const loaded = loadDailyGameState('de', dateKey);
      expect(loaded.guesses).toEqual(guesses);
      expect(loaded.evaluations).toEqual(evaluations);
      expect(loaded.status).toBe('playing');
      expect(loaded.message).toBeNull();
    });

    it('persists and restores won state with congratulatory message', () => {
      const dateKey = '2026-09-03';
      const target = wordleEngine.getDailyTargetWord('de', dateKey);
      const guesses = [target];
      const evaluations = [wordleEngine.evaluateGuess(target, target)];

      saveDailyGameState('de', dateKey, {
        guesses,
        evaluations,
        status: 'won',
      });

      const loaded = loadDailyGameState('de', dateKey);
      expect(loaded.guesses).toEqual([target]);
      expect(loaded.status).toBe('won');
      expect(loaded.message).toBe('wordle.congratulations');
    });

    it('persists and restores lost state with game over message', () => {
      const dateKey = '2026-09-03';
      const target = wordleEngine.getDailyTargetWord('de', dateKey);
      const guesses = ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE', 'FFFFF'];
      const evaluations = guesses.map((g) => wordleEngine.evaluateGuess(g, target));

      saveDailyGameState('de', dateKey, {
        guesses,
        evaluations,
        status: 'lost',
      });

      const loaded = loadDailyGameState('de', dateKey);
      expect(loaded.guesses.length).toBe(6);
      expect(loaded.status).toBe('lost');
      expect(loaded.message).toBe('wordle.game_over');
    });

    it('does not overwrite existing saved progress when empty state is provided', () => {
      const dateKey = '2026-09-03';
      const target = wordleEngine.getDailyTargetWord('de', dateKey);

      // Save valid in-progress game
      saveDailyGameState('de', dateKey, {
        guesses: ['BLUME'],
        evaluations: [wordleEngine.evaluateGuess('BLUME', target)],
        status: 'playing',
      });

      // Attempt to save empty state
      saveDailyGameState('de', dateKey, {
        guesses: [],
        evaluations: [],
        status: 'playing',
      });

      // Existing progress must remain intact
      const loaded = loadDailyGameState('de', dateKey);
      expect(loaded.guesses).toEqual(['BLUME']);
    });

    it('handles corrupted JSON in localStorage gracefully without throwing', () => {
      const dateKey = '2026-09-03';
      const storageKey = getDailyStorageKey('de', dateKey);
      store[storageKey] = '{ invalid_json ::::';

      const state = loadDailyGameState('de', dateKey);
      expect(state.status).toBe('playing');
      expect(state.guesses).toEqual([]);
    });

    it('keeps different dates independent so a new day starts clean', () => {
      const yesterday = '2026-09-02';
      const today = '2026-09-03';

      saveDailyGameState('de', yesterday, {
        guesses: ['APFEL'],
        evaluations: [wordleEngine.evaluateGuess('APFEL', wordleEngine.getDailyTargetWord('de', yesterday))],
        status: 'won',
      });

      const yesterdayState = loadDailyGameState('de', yesterday);
      expect(yesterdayState.status).toBe('won');
      expect(yesterdayState.guesses).toEqual(['APFEL']);

      // Today should be a fresh new puzzle
      const todayState = loadDailyGameState('de', today);
      expect(todayState.status).toBe('playing');
      expect(todayState.guesses).toEqual([]);
      expect(todayState.dateKey).toBe(today);
    });
  });

  describe('stats persistence', () => {
    it('saves and loads stats correctly', () => {
      const stats = wordleEngine.getInitialStats();
      stats.played = 5;
      stats.wins = 4;
      stats.currentStreak = 3;
      stats.maxStreak = 4;
      stats.lastCompletedDate = '2026-09-03';

      saveWordleStats(stats);
      const loaded = loadWordleStats();
      expect(loaded).toEqual(stats);
    });

    it('returns initial stats if localStorage has no stats', () => {
      const stats = loadWordleStats();
      expect(stats).toEqual(wordleEngine.getInitialStats());
    });
  });
});
