import { generateVariants, levenshtein, normalize, normalizeTokens } from './lingo';
import type { WordTranslationEntry } from './types';

export const isAnagram = (a: string, b: string): boolean => {
  const cleanA = a.replace(/\s+/g, '');
  const cleanB = b.replace(/\s+/g, '');
  if (cleanA.length !== cleanB.length || cleanA.length === 0) {
    return false;
  }
  const sortChars = (s: string) => Array.from(s).sort().join('');
  return sortChars(cleanA) === sortChars(cleanB);
};

export interface CandidateSets {
  exactCandidates: Map<string, string>;
  fuzzyCandidates: Map<string, string>;
}

export const buildCandidateSets = (
  translations?: Record<string, WordTranslationEntry> | null,
  fallbackWord?: string,
): CandidateSets => {
  const exactCandidates = new Map<string, string>();
  const fuzzyCandidates = new Map<string, string>();

  const addExact = (value?: string | null) => {
    if (typeof value !== 'string' || !value.trim()) {
      return;
    }
    const normalized = normalize(value);
    if (!normalized || exactCandidates.has(normalized)) {
      return;
    }
    exactCandidates.set(normalized, value);
  };

  const addFuzzy = (value?: string | null) => {
    if (typeof value !== 'string' || !value.trim()) {
      return;
    }
    const normalized = normalize(value);
    if (!normalized) {
      return;
    }
    addExact(value);
    if (!fuzzyCandidates.has(normalized)) {
      fuzzyCandidates.set(normalized, value);
    }
  };

  if (translations && typeof translations === 'object') {
    Object.values(translations).forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      if (entry.canonical) {
        addFuzzy(entry.canonical);
        generateVariants(entry.canonical).forEach((derived) => addExact(derived));
      }
      if (Array.isArray(entry.synonyms)) {
        entry.synonyms.forEach((syn) => {
          addFuzzy(syn);
          generateVariants(syn).forEach((derived) => addExact(derived));
        });
      }
      if (Array.isArray(entry.forms)) {
        entry.forms.forEach((form) => addExact(form));
      }
      if (Array.isArray(entry.gendered)) {
        entry.gendered.forEach((genderForm) => addExact(genderForm));
      }
    });
  }

  if (fallbackWord) {
    addFuzzy(fallbackWord);
    generateVariants(fallbackWord).forEach((variant) => addExact(variant));
  }

  return { exactCandidates, fuzzyCandidates };
};

export const buildCandidateSet = (
  translations?: Record<string, WordTranslationEntry> | null,
  fallbackWord?: string,
): Map<string, string> => {
  const { exactCandidates } = buildCandidateSets(translations, fallbackWord);
  return exactCandidates;
};

export const fuzzyThreshold = (length: number): number => {
  if (length <= 4) return 0;
  if (length <= 6) return 1;
  if (length <= 9) return 2;
  return 3;
};

export const shareToken = (a: string[], b: string[]): boolean => {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) {
    return false;
  }
  const set = new Set(a);
  return b.some((token) => set.has(token));
};

export interface EvaluateGuessOptions {
  exactOnly?: boolean;
}

export const evaluateGuess = (
  translations?: Record<string, WordTranslationEntry> | null,
  fallbackWord?: string,
  guess?: string,
  options?: EvaluateGuessOptions,
): boolean => {
  if (!guess) {
    return false;
  }
  const normalizedGuess = normalize(guess);
  if (!normalizedGuess) {
    return false;
  }
  const { exactCandidates, fuzzyCandidates } = buildCandidateSets(translations, fallbackWord);
  if (exactCandidates.has(normalizedGuess)) {
    return true;
  }
  if (options?.exactOnly) {
    return false;
  }
  const guessTokens = normalizeTokens(guess);

  for (const [candidateNorm] of fuzzyCandidates) {
    // If guess is a scrambled anagram (same letters in wrong order), do NOT match via fuzzy
    if (isAnagram(normalizedGuess, candidateNorm)) {
      continue;
    }

    const threshold = fuzzyThreshold(candidateNorm.length);
    if (threshold === 0) {
      continue;
    }
    const distance = levenshtein(normalizedGuess, candidateNorm);
    if (distance === 0) {
      return true;
    }
    if (distance <= threshold) {
      const candidateTokens = candidateNorm.split(' ').filter(Boolean);
      if (candidateTokens.length <= 1 || guessTokens.length <= 1 || shareToken(guessTokens, candidateTokens)) {
        return true;
      }
    }
  }
  return false;
};
