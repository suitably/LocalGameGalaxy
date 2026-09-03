/**
 * wordleStorage.ts - Persistence Layer for Wordle Daily Challenges & Stats
 */

import { wordleEngine } from './wordleEngine';
import type { WordleState, WordleStats } from './types';

export const STATS_STORAGE_KEY = 'galaxy_wordle_stats';
export const DAILY_STORAGE_PREFIX = 'galaxy_wordle_daily_';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function getTodayDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeWordleLang(lang: string): 'de' | 'en' {
  return lang.startsWith('de') ? 'de' : 'en';
}

export function getDailyStorageKey(lang: string, dateKey: string): string {
  const langKey = normalizeWordleLang(lang);
  return `${DAILY_STORAGE_PREFIX}${langKey}_${dateKey}`;
}

export function loadDailyGameState(lang: string, dateKey: string): WordleState {
  const langKey = normalizeWordleLang(lang);
  const target = wordleEngine.getDailyTargetWord(langKey, dateKey);
  const storageKey = getDailyStorageKey(langKey, dateKey);

  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const status = parsed.status === 'won' || parsed.status === 'lost' ? parsed.status : 'playing';
        const guesses = Array.isArray(parsed.guesses) ? parsed.guesses : [];
        const evaluations = Array.isArray(parsed.evaluations) ? parsed.evaluations : [];

        return {
          targetWord: target,
          guesses,
          evaluations,
          currentInput: '',
          status,
          mode: 'daily',
          dateKey,
          invalidWordShake: false,
          message: status === 'won' ? 'wordle.congratulations' : status === 'lost' ? 'wordle.game_over' : null,
        };
      }
    } catch {
      // Fallback to fresh daily state if storage read fails
    }
  }

  return {
    targetWord: target,
    guesses: [],
    evaluations: [],
    currentInput: '',
    status: 'playing',
    mode: 'daily',
    dateKey,
    invalidWordShake: false,
    message: null,
  };
}

export function saveDailyGameState(
  lang: string,
  dateKey: string,
  state: Pick<WordleState, 'guesses' | 'evaluations' | 'status'>
): void {
  // Only persist if at least one guess was made or the game has concluded
  if (state.guesses.length === 0 && state.status === 'playing') {
    return;
  }

  const storage = getStorage();
  if (!storage) return;

  const storageKey = getDailyStorageKey(lang, dateKey);
  try {
    storage.setItem(
      storageKey,
      JSON.stringify({
        guesses: state.guesses,
        evaluations: state.evaluations,
        status: state.status,
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadWordleStats(): WordleStats {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STATS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : wordleEngine.getInitialStats();
    } catch {
      return wordleEngine.getInitialStats();
    }
  }
  return wordleEngine.getInitialStats();
}

export function saveWordleStats(stats: WordleStats): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}
