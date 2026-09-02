/**
 * wordleEngine.ts - Pure Logic Engine for Wordle
 */

import LZString from 'lz-string';
import type { EvaluatedLetter, LetterStatus, WordleStats } from './types';

// Curated 5-letter German target words (clean uppercase, normalized AE/OE/UE/SS if needed or standard 5-letters)
export const GERMAN_TARGET_WORDS = [
  'APFEL', 'BLUME', 'BRIEF', 'DRAHT', 'ENGEL', 'FEUER', 'FUCHS', 'GLANZ', 'HAFEN', 'INSEL',
  'JACKE', 'KATER', 'LAMPE', 'MAUER', 'NADEL', 'ONKEL', 'PFEIL', 'QUALM', 'RUDER', 'SONNE',
  'TIGER', 'VOGEL', 'WOLKE', 'ZEBRA', 'BAUMX', 'STERN', 'TRAUM', 'STURM', 'KRAFT', 'BLITZ',
  'STEIN', 'KLEID', 'TISCH', 'STUHL', 'KERZE', 'PFERD', 'KOPFX', 'FARBE', 'BUCHX', 'HANDY',
  'WELLE', 'FROST', 'KRONE', 'REGEN', 'STADT', 'PRINZ', 'FLUSS', 'KREUZ', 'SPORT', 'SPIEL',
  'MUSIK', 'RADIO', 'PARTY', 'MOTOR', 'PROFI', 'BRAUT', 'CLOWN', 'FAHRT', 'GLEIS', 'HONIG',
  'JUWEL', 'KABEL', 'LINSE', 'MARKE', 'NAGEL', 'ORGAN', 'PINSEL', 'QUARK', 'RASEN', 'SAUCE',
  'TANTE', 'VASEN', 'WAGEN', 'ZUCKER', 'BODEN', 'DECKE', 'FENST', 'GARTN', 'HALLE', 'KUECHE',
  'RASCH', 'STILL', 'STARK', 'SANFT', 'SMART', 'BRAUN', 'BLAUU', 'GRUEN', 'WEISS', 'BLANK',
  'FRISCH', 'MUTIG', 'TREUUE', 'KLASS', 'SUPER', 'GENIE', 'TREFF', 'PUNKT', 'CHEFX', 'FORUM',
].map((w) => w.substring(0, 5).toUpperCase());

// Curated 5-letter English target words
export const ENGLISH_TARGET_WORDS = [
  'APPLE', 'BEACH', 'BRAIN', 'BREAD', 'CHAIR', 'CLEAN', 'CLOCK', 'CLOUD', 'DANCE', 'DREAM',
  'EARTH', 'FLAME', 'FRUIT', 'GHOST', 'GLASS', 'GRAPE', 'HEART', 'HOUSE', 'JUICE', 'LEMON',
  'LIGHT', 'MAGIC', 'MONEY', 'MUSIC', 'OCEAN', 'PARTY', 'PIANO', 'PILOT', 'PLANT', 'QUEEN',
  'RADIO', 'RIVER', 'ROBOT', 'SHARK', 'SMILE', 'SNAKE', 'SPACE', 'STORM', 'SUGAR', 'TIGER',
  'TRAIN', 'WATER', 'WHALE', 'WORLD', 'ZEBRA', 'BLACK', 'WHITE', 'GREEN', 'BROWN', 'SWEET',
  'BRAVE', 'HAPPY', 'LUCKY', 'SMART', 'FRESH', 'SWIFT', 'BRIGHT', 'SHINE', 'PRIDE', 'POWER',
].map((w) => w.substring(0, 5).toUpperCase());

export function normalizeWord(word: string): string {
  return word
    .trim()
    .toUpperCase()
    .replace(/Ä/g, 'AE')
    .replace(/Ö/g, 'OE')
    .replace(/Ü/g, 'UE')
    .replace(/ß/g, 'SS')
    .replace(/[^A-Z]/g, '')
    .substring(0, 5);
}

export const wordleEngine = {
  /**
   * Returns the word list for a language.
   */
  getTargetWordList(lang: string): string[] {
    return lang.startsWith('de') ? GERMAN_TARGET_WORDS : ENGLISH_TARGET_WORDS;
  },

  /**
   * Deterministic hash from date string (YYYY-MM-DD) to pick the Daily Wordle.
   */
  getDailyTargetWord(lang: string, dateStr: string): string {
    const words = this.getTargetWordList(lang);
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % words.length;
    return words[index];
  },

  /**
   * Returns a random target word for practice mode.
   */
  getRandomTargetWord(lang: string): string {
    const words = this.getTargetWordList(lang);
    const index = Math.floor(Math.random() * words.length);
    return words[index];
  },

  /**
   * Validates if a guess is a valid 5-letter word format.
   */
  isValidGuess(guess: string): boolean {
    const clean = guess.trim().toUpperCase();
    return clean.length === 5 && /^[A-Z]{5}$/.test(clean);
  },

  /**
   * Evaluates a 5-letter guess against the target word using standard Wordle two-pass matching.
   */
  evaluateGuess(guess: string, target: string): EvaluatedLetter[] {
    const cleanGuess = guess.toUpperCase().substring(0, 5);
    const cleanTarget = target.toUpperCase().substring(0, 5);

    const result: EvaluatedLetter[] = Array.from({ length: 5 }, (_, i) => ({
      char: cleanGuess[i] || '',
      status: 'absent' as LetterStatus,
    }));

    const targetCounts: Record<string, number> = {};
    for (const c of cleanTarget) {
      targetCounts[c] = (targetCounts[c] || 0) + 1;
    }

    // Pass 1: Check exact matches (correct / green)
    for (let i = 0; i < 5; i++) {
      if (cleanGuess[i] === cleanTarget[i]) {
        result[i].status = 'correct';
        targetCounts[cleanGuess[i]]--;
      }
    }

    // Pass 2: Check present matches (present / yellow)
    for (let i = 0; i < 5; i++) {
      if (result[i].status !== 'correct') {
        const char = cleanGuess[i];
        if (targetCounts[char] && targetCounts[char] > 0) {
          result[i].status = 'present';
          targetCounts[char]--;
        } else {
          result[i].status = 'absent';
        }
      }
    }

    return result;
  },

  /**
   * Computes key status colors for on-screen keyboard based on all past evaluations.
   */
  getKeyStatuses(evaluations: EvaluatedLetter[][]): Record<string, LetterStatus> {
    const statuses: Record<string, LetterStatus> = {};

    for (const row of evaluations) {
      for (const { char, status } of row) {
        const current = statuses[char];
        if (status === 'correct') {
          statuses[char] = 'correct';
        } else if (status === 'present' && current !== 'correct') {
          statuses[char] = 'present';
        } else if (status === 'absent' && !current) {
          statuses[char] = 'absent';
        }
      }
    }

    return statuses;
  },

  /**
   * Encodes a custom duel target word for sharing.
   */
  encodeDuelWord(word: string): string {
    const clean = word.trim().toUpperCase().substring(0, 5);
    return LZString.compressToEncodedURIComponent(clean);
  },

  /**
   * Decodes a custom duel target word from URL parameter.
   */
  decodeDuelWord(encoded: string): string | null {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
      if (decompressed && decompressed.length === 5 && /^[A-Z]{5}$/.test(decompressed)) {
        return decompressed.toUpperCase();
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Generates shareable emoji result grid (e.g. for WhatsApp / Clipboard).
   */
  generateShareGrid(evaluations: EvaluatedLetter[][], won: boolean, mode: string, dateKey: string): string {
    const countStr = won ? `${evaluations.length}/6` : 'X/6';
    const header = mode === 'daily' ? `Wordle (${dateKey}) ${countStr}` : `Wordle Challenge ${countStr}`;

    const grid = evaluations
      .map((row) =>
        row
          .map((letter) => {
            if (letter.status === 'correct') return '🟩';
            if (letter.status === 'present') return '🟨';
            return '⬛';
          })
          .join('')
      )
      .join('\n');

    return `${header}\n\n${grid}\n\nhttps://localgamegalaxy.app/#/games/wordle`;
  },

  /**
   * Updates stats upon game completion.
   */
  updateStats(prevStats: WordleStats, won: boolean, guessCount: number, dateKey?: string): WordleStats {
    const newStats: WordleStats = {
      played: prevStats.played + 1,
      wins: prevStats.wins + (won ? 1 : 0),
      currentStreak: won ? prevStats.currentStreak + 1 : 0,
      maxStreak: won ? Math.max(prevStats.maxStreak, prevStats.currentStreak + 1) : prevStats.maxStreak,
      guessDistribution: { ...prevStats.guessDistribution },
      lastCompletedDate: dateKey,
    };

    if (won && guessCount >= 1 && guessCount <= 6) {
      const key = guessCount as 1 | 2 | 3 | 4 | 5 | 6;
      newStats.guessDistribution[key] = (newStats.guessDistribution[key] || 0) + 1;
    }

    return newStats;
  },

  /**
   * Returns empty initial stats.
   */
  getInitialStats(): WordleStats {
    return {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    };
  },
};
