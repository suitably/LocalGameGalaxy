import { describe, expect, it } from 'vitest';
import { ENGLISH_ALLOWED_GUESSES, GERMAN_ALLOWED_GUESSES } from './allowedGuesses';
import { isDictionaryWord } from './dictionary';

describe.each([
  ['German', GERMAN_ALLOWED_GUESSES],
  ['English', ENGLISH_ALLOWED_GUESSES],
])('%s allowed guesses', (_name, words) => {
  it('contains only unique 5-letter A-Z words', () => {
    for (const w of words) expect(w).toMatch(/^[A-Z]{5}$/);
    expect(new Set(words).size).toBe(words.length);
  });
});

describe('isDictionaryWord', () => {
  it('accepts target and allowed words per language, case-insensitively', () => {
    expect(isDictionaryWord('apfel', 'de')).toBe(true);
    expect(isDictionaryWord('ABEND', 'de-DE')).toBe(true);
    expect(isDictionaryWord('APPLE', 'en')).toBe(true);
    expect(isDictionaryWord('ABOUT', 'en-US')).toBe(true);
  });

  it('rejects unknown words and words of the other language', () => {
    expect(isDictionaryWord('QXZVW', 'en')).toBe(false);
    expect(isDictionaryWord('APFEL', 'en')).toBe(false);
  });

  it('always accepts the current target word (duel)', () => {
    expect(isDictionaryWord('QXZVW', 'en', 'qxzvw')).toBe(true);
  });
});
