/**
 * wordleStorage.ts - Persistence Layer for Wordle Daily Challenges & Stats [ID: WORDLE-STORAGE]
 * Uses centralized storage service with in-memory fallback.
 */

import { wordleEngine } from './wordleEngine';
import type { WordleState, WordleStats } from './types';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

export const STATS_STORAGE_KEY = STORAGE_KEYS.WORDLE_STATS;
export const DAILY_STORAGE_PREFIX = 'galaxy_wordle_daily_';

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

  const parsed = storage.getJson<any>(storageKey, null);
  if (parsed) {
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

  const storageKey = getDailyStorageKey(lang, dateKey);
  storage.setJson(storageKey, {
    guesses: state.guesses,
    evaluations: state.evaluations,
    status: state.status,
  });
}

export function loadWordleStats(): WordleStats {
  return storage.getJson<WordleStats>(STATS_STORAGE_KEY, wordleEngine.getInitialStats());
}

export function saveWordleStats(stats: WordleStats): void {
  storage.setJson(STATS_STORAGE_KEY, stats);
}
