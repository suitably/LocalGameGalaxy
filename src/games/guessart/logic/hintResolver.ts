import type { WordTranslationEntry } from './types';

export const normalizeLanguageCode = (code?: string): string => {
  if (!code) {
    return '';
  }
  return code.trim().toLowerCase();
};

export const shortLanguageCode = (code?: string): string => {
  const normalized = normalizeLanguageCode(code);
  if (!normalized) {
    return '';
  }
  const [primary] = normalized.split('-');
  return primary.length <= 3 ? primary : primary.slice(0, 3);
};

export const buildWordMask = (word?: string): string[] => {
  if (!word) {
    return [];
  }
  const mask: string[] = [];
  Array.from(word).forEach((char) => {
    if (char === ' ') {
      mask.push(' ');
    } else {
      mask.push('_');
    }
  });
  return mask;
};

export const buildHintLetters = (word?: string): string[] => {
  if (!word) {
    return [];
  }

  const vowelExtras = 2;
  const consonantExtras = 3;

  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const consonants = [
    'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
    'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z',
  ];
  const baseLetters: string[] = [];
  const letterCounts = new Map<string, number>();

  Array.from(word).forEach((char) => {
    if (!/[A-Za-zäöüÄÖÜß]/.test(char)) {
      return;
    }
    const upper = char.toUpperCase();
    baseLetters.push(upper);
    letterCounts.set(upper, (letterCounts.get(upper) || 0) + 1);
  });

  if (baseLetters.length === 0) {
    return [];
  }

  const hashBuffer = new TextEncoder().encode(word.toUpperCase());
  let seed = 0;
  for (let i = 0; i < hashBuffer.length; i += 1) {
    seed = (seed * 31 + hashBuffer[i]) >>> 0;
  }
  let rngState = seed || 1;
  const nextRandom = () => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState;
  };

  const extras: string[] = [];
  const pickLetters = (pool: string[], count: number) => {
    if (!Array.isArray(pool) || pool.length === 0 || count <= 0) {
      return;
    }
    let added = 0;
    let attempts = 0;
    const maxAttempts = pool.length * 6;

    while (added < count && attempts < maxAttempts) {
      attempts += 1;
      const choice = pool[nextRandom() % pool.length];
      if (!choice) {
        continue;
      }
      const existing = letterCounts.get(choice) || 0;
      if (existing > 0 && attempts < pool.length * 3) {
        continue;
      }
      extras.push(choice);
      letterCounts.set(choice, existing + 1);
      added += 1;
    }
  };

  pickLetters(vowels, vowelExtras);
  pickLetters(consonants, consonantExtras);

  const result = [...baseLetters, ...extras];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = nextRandom() % (i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
};

export const resolveWordForLanguage = (
  translations?: Record<string, WordTranslationEntry> | null,
  requested?: string,
  fallbackLang?: string,
  fallbackWord?: string,
): { word: string; language: string } => {
  if (translations && typeof translations === 'object') {
    const keys = [
      normalizeLanguageCode(requested),
      shortLanguageCode(requested),
      normalizeLanguageCode(fallbackLang),
      shortLanguageCode(fallbackLang),
    ].filter(Boolean);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (key && translations[key] && translations[key].canonical) {
        return { word: translations[key].canonical, language: key };
      }
    }

    const fallbackEntry = Object.entries(translations).find(([, entry]) => entry?.canonical);
    if (fallbackEntry) {
      const [lang, entry] = fallbackEntry;
      return { word: entry.canonical, language: lang };
    }
  }

  if (fallbackWord) {
    return {
      word: fallbackWord,
      language: normalizeLanguageCode(requested) || normalizeLanguageCode(fallbackLang),
    };
  }

  return { word: '', language: '' };
};

export const resolveHintArtifacts = (
  translations?: Record<string, WordTranslationEntry> | null,
  requested?: string,
  fallbackLang?: string,
  fallbackWord?: string,
): { mask: string[]; length: number; letters: string[]; language: string } | null => {
  const { word, language } = resolveWordForLanguage(translations, requested, fallbackLang, fallbackWord);
  const trimmed = word.trim();
  if (!trimmed) {
    return null;
  }
  return {
    mask: buildWordMask(trimmed),
    length: Array.from(trimmed).length,
    letters: buildHintLetters(trimmed),
    language: language || normalizeLanguageCode(requested) || normalizeLanguageCode(fallbackLang),
  };
};
