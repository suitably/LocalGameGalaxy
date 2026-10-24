import { describe, it, expect } from 'vitest';
import { ENGLISH_TARGET_WORDS, GERMAN_TARGET_WORDS } from './wordleEngine';

describe.each([
  ['German', GERMAN_TARGET_WORDS],
  ['English', ENGLISH_TARGET_WORDS],
])('%s target words', (_name, words) => {
  it('contains only 5-letter A-Z words', () => {
    for (const w of words) expect(w).toMatch(/^[A-ZÄÖÜ]{5}$/);
  });

  it('has no duplicates', () => {
    expect(new Set(words).size).toBe(words.length);
  });
});

describe('German target words', () => {
  it('has no placeholder padding or truncated words', () => {
    const placeholders = ['BAUMX', 'KOPFX', 'BUCHX', 'CHEFX', 'BLAUU', 'FENST', 'GARTN'];
    for (const p of placeholders) expect(GERMAN_TARGET_WORDS).not.toContain(p);
    expect(GERMAN_TARGET_WORDS.filter((w) => w.endsWith('X'))).toEqual([]);
  });
});
