const UMLAUT_MAP: Readonly<Record<string, string>> = Object.freeze({
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
});

const umlautRegex = /[äöüß]/g;
const diacriticRegex = /[\u0300-\u036f]/g;
const dashApostropheRegex = /[-_'\u2019]+/g;
const nonAlphaNumericRegex = /[^a-z0-9 ]+/g;
const whitespaceRegex = /\s+/g;

export const transliterateUmlauts = (value: string): string =>
  value.replace(umlautRegex, (match) => UMLAUT_MAP[match] || match);

export const stripDiacritics = (value: string): string =>
  value.normalize('NFD').replace(diacriticRegex, '').normalize('NFC');

export const normalize = (input?: string | null): string => {
  if (typeof input !== 'string') {
    return '';
  }
  let value = input.trim().toLowerCase();
  if (!value) {
    return '';
  }
  value = transliterateUmlauts(value);
  value = stripDiacritics(value);
  value = value.replace(dashApostropheRegex, ' ');
  value = value.replace(nonAlphaNumericRegex, ' ');
  value = value.replace(whitespaceRegex, ' ').trim();
  return value;
};

export const normalizeTokens = (input?: string | null): string[] => {
  const normalized = normalize(input);
  if (!normalized) {
    return [];
  }
  return normalized.split(' ').filter(Boolean);
};

export const isUpper = (value: string): boolean => {
  let hasLetters = false;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch.toUpperCase() !== ch.toLowerCase()) {
      hasLetters = true;
      if (ch !== ch.toUpperCase()) {
        return false;
      }
    }
  }
  return hasLetters;
};

export const isTitle = (value: string): boolean => {
  if (!value) {
    return false;
  }
  const first = value[0];
  return first === first.toUpperCase() && first !== first.toLowerCase();
};

export const isConsonant = (char: string): boolean => {
  const lower = char.toLowerCase();
  if (!/[a-zäöü]/.test(lower)) {
    return false;
  }
  return !['a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü'].includes(lower);
};

export const applyCase = (original: string, candidate: string): string => {
  if (!original) {
    return candidate;
  }
  if (isUpper(original)) {
    return candidate.toUpperCase();
  }
  if (isTitle(original)) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }
  return candidate;
};

export const englishPluralForms = (word: string): string[] => {
  const lower = word.trim().toLowerCase();
  if (!lower) {
    return [];
  }
  if (/(s|x|z|sh|ch)$/.test(lower)) {
    return [`${word}es`];
  }
  if (lower.endsWith('y') && lower.length > 1 && isConsonant(lower[lower.length - 2])) {
    return [`${word.slice(0, -1)}ies`];
  }
  if (lower.endsWith('f')) {
    return [`${word.slice(0, -1)}ves`, `${word}s`];
  }
  if (lower.endsWith('fe')) {
    return [`${word.slice(0, -2)}ves`, `${word}s`];
  }
  return [`${word}s`];
};

export const genericPluralForms = (word: string): string[] => {
  const trimmed = word.trim();
  if (!trimmed) {
    return [];
  }
  if (!(isTitle(trimmed) || isUpper(trimmed))) {
    return [];
  }
  const lower = trimmed.toLowerCase();
  if (lower.endsWith('e') || lower.endsWith('er')) {
    return [`${trimmed}n`];
  }
  return [`${trimmed}e`];
};

export const germanGenderForms = (word: string): string[] => {
  const trimmed = word.trim();
  if (!trimmed || !(isTitle(trimmed) || isUpper(trimmed))) {
    return [];
  }
  const lower = trimmed.toLowerCase();
  const valid =
    lower.endsWith('er') ||
    lower.endsWith('eur') ||
    lower.endsWith('iker') ||
    lower.endsWith('ologe') ||
    lower.endsWith('ist') ||
    lower.endsWith('or');
  if (!valid) {
    return [];
  }
  return [
    `${trimmed}in`,
    `${trimmed}innen`,
    `${trimmed}:in`,
    `${trimmed}:innen`,
    `${trimmed}*in`,
    `${trimmed}*innen`,
    `${trimmed}/in`,
    `${trimmed}Innen`,
  ];
};

export const deduplicate = (values: string[]): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const key = value.trim();
    if (!key || seen.has(key.toLowerCase())) {
      return;
    }
    seen.add(key.toLowerCase());
    result.push(key);
  });
  return result;
};

export const generateVariants = (term: string): string[] => {
  if (typeof term !== 'string') {
    return [];
  }
  const tokens = term.trim().split(/\s+/);
  if (tokens.length === 0) {
    return [];
  }
  const last = tokens[tokens.length - 1];
  const variants = new Set<string>();

  englishPluralForms(last).forEach((candidate) => {
    variants.add(applyCase(last, candidate));
  });
  genericPluralForms(last).forEach((candidate) => {
    variants.add(applyCase(last, candidate));
  });
  germanGenderForms(last).forEach((candidate) => {
    variants.add(candidate);
  });

  if (variants.size === 0) {
    return [];
  }

  const results: string[] = [];
  variants.forEach((candidate) => {
    const clone = tokens.slice();
    clone[clone.length - 1] = candidate;
    results.push(clone.join(' '));
  });

  return deduplicate(results);
};

export const levenshtein = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }
  if (!a) {
    return b.length;
  }
  if (!b) {
    return a.length;
  }
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};
