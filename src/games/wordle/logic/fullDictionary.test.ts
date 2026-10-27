import { beforeAll, describe, expect, it } from 'vitest';
import { isDictionaryWord } from './dictionary';
import { loadFullDictionary, parseWordString } from './fullDictionary';

describe('parseWordString', () => {
  it('splits fixed-width packed words', () => {
    expect([...parseWordString('ABCDEFGHIJ')]).toEqual(['ABCDE', 'FGHIJ']);
  });
});

describe('full dictionary', () => {
  beforeAll(async () => {
    await Promise.all([loadFullDictionary('de'), loadFullDictionary('en')]);
  });

  it('contains only 5-letter A-Z words', async () => {
    for (const lang of ['de', 'en']) {
      const words = await loadFullDictionary(lang);
      expect(words.size).toBeGreaterThan(3000);
      for (const w of words) expect(w).toMatch(/^[A-Z]{5}$/);
    }
  });

  it('accepts inflected German words', () => {
    for (const w of ['HAUSE', 'GEHST', 'LAUFT', 'LIEBE']) {
      expect(isDictionaryWord(w, 'de')).toBe(true);
    }
  });

  it('accepts English words and rejects nonsense', () => {
    expect(isDictionaryWord('crane', 'en')).toBe(true);
    expect(isDictionaryWord('QXZVW', 'de')).toBe(false);
    expect(isDictionaryWord('QXZVW', 'en')).toBe(false);
  });

  it('still always accepts the target word', () => {
    expect(isDictionaryWord('QXZVW', 'de', 'qxzvw')).toBe(true);
  });
});
