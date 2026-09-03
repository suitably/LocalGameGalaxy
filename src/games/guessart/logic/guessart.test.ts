import { describe, it, expect } from 'vitest';
import {
  germanGenderForms,
  levenshtein,
  normalize,
  transliterateUmlauts,
} from './lingo';
import { evaluateGuess } from './guessEvaluator';
import { buildHintLetters, buildWordMask, resolveHintArtifacts } from './hintResolver';

describe('GuessArt Lingo & Normalization', () => {
  it('transliterates German umlauts correctly', () => {
    expect(transliterateUmlauts('Kätzchen')).toBe('Kaetzchen');
    expect(transliterateUmlauts('Schönheit')).toBe('Schoenheit');
    expect(transliterateUmlauts('Füße')).toBe('Fuesse');
  });

  it('normalizes string removing extra spaces, punctuation and diacritics', () => {
    expect(normalize('  Café-Bar! ')).toBe('cafe bar');
    expect(normalize('Äpfel & Birnen')).toBe('aepfel birnen');
  });

  it('generates German gender forms', () => {
    const forms = germanGenderForms('Informatiker');
    expect(forms).toContain('Informatikerin');
    expect(forms).toContain('Informatikerinnen');
  });

  it('calculates Levenshtein distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('hund', 'hund')).toBe(0);
    expect(levenshtein('katze', 'kaze')).toBe(1);
  });
});

describe('GuessArt Guess Evaluator', () => {
  const translations = {
    de: {
      canonical: 'Fahrrad',
      synonyms: ['Rad', 'Drahtesel', 'Bike'],
    },
    en: {
      canonical: 'Bicycle',
      synonyms: ['Bike', 'Cycle'],
    },
  };

  it('matches exact canonical word in any supported language', () => {
    expect(evaluateGuess(translations, 'Fahrrad', 'Fahrrad')).toBe(true);
    expect(evaluateGuess(translations, 'Fahrrad', 'fahrrad')).toBe(true);
    expect(evaluateGuess(translations, 'Fahrrad', 'Bicycle')).toBe(true);
  });

  it('matches synonyms and abbreviations', () => {
    expect(evaluateGuess(translations, 'Fahrrad', 'Rad')).toBe(true);
    expect(evaluateGuess(translations, 'Fahrrad', 'Drahtesel')).toBe(true);
    expect(evaluateGuess(translations, 'Fahrrad', 'Bike')).toBe(true);
  });

  it('matches fuzzy typos within threshold', () => {
    // 'fahrrad' length 7 -> threshold 2
    expect(evaluateGuess(translations, 'Fahrrad', 'Farad')).toBe(true);
    expect(evaluateGuess(translations, 'Fahrrad', 'Fahrrrad')).toBe(true);
  });

  it('rejects completely wrong guesses', () => {
    expect(evaluateGuess(translations, 'Fahrrad', 'Auto')).toBe(false);
    expect(evaluateGuess(translations, 'Fahrrad', 'Hubschrauber')).toBe(false);
  });

  it('rejects scrambled anagrams / wrong letter orders such as Pizaz for Pizza', () => {
    const pizzaTrans = {
      de: { canonical: 'Pizza', synonyms: [] },
      en: { canonical: 'Pizza', synonyms: [] },
    };
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pizza')).toBe(true);
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pizzas')).toBe(true);
    // Transposed letters / wrong letter order
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pizaz')).toBe(false);
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pazzi')).toBe(false);
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pziza')).toBe(false);

    const katzeTrans = {
      de: { canonical: 'Katze', synonyms: ['Mieze'] },
    };
    expect(evaluateGuess(katzeTrans, 'Katze', 'Kazte')).toBe(false);
    expect(evaluateGuess(katzeTrans, 'Katze', 'Kzaet')).toBe(false);
  });

  it('enforces exact matching when exactOnly option is enabled (e.g. Hint Stage 2 letter chips)', () => {
    const pizzaTrans = {
      de: { canonical: 'Pizza', synonyms: [] },
    };
    // In exactOnly mode, typos are rejected
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Piza', { exactOnly: true })).toBe(false);
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pizaz', { exactOnly: true })).toBe(false);
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pizza', { exactOnly: true })).toBe(true);
    expect(evaluateGuess(pizzaTrans, 'Pizza', 'Pizzas', { exactOnly: true })).toBe(true);

    const fussballTrans = {
      de: { canonical: 'Fußball', synonyms: [] },
    };
    expect(evaluateGuess(fussballTrans, 'Fußball', 'FUSSBALL', { exactOnly: true })).toBe(true);
    expect(evaluateGuess(fussballTrans, 'Fußball', 'Fußball', { exactOnly: true })).toBe(true);
    expect(evaluateGuess(fussballTrans, 'Fußball', 'fussball', { exactOnly: true })).toBe(true);
  });
});

describe('GuessArt Hint Resolver', () => {
  it('builds word mask with spaces preserved', () => {
    expect(buildWordMask('Ice Cream')).toEqual(['_', '_', '_', ' ', '_', '_', '_', '_', '_']);
    expect(buildWordMask('Hund')).toEqual(['_', '_', '_', '_']);
  });

  it('builds deterministic hint letter pool including true letters and extra distractors', () => {
    const letters = buildHintLetters('Katze');
    expect(letters).toContain('K');
    expect(letters).toContain('A');
    expect(letters).toContain('T');
    expect(letters).toContain('Z');
    expect(letters).toContain('E');
    expect(letters.length).toBeGreaterThanOrEqual(5);
  });

  it('resolves hint artifacts correctly for given translations', () => {
    const translations = {
      de: { canonical: 'Elefant', synonyms: [] },
      en: { canonical: 'Elephant', synonyms: [] },
    };
    const deArtifacts = resolveHintArtifacts(translations, 'de', 'en', 'Elefant');
    expect(deArtifacts).not.toBeNull();
    expect(deArtifacts?.length).toBe(7);
    expect(deArtifacts?.mask.length).toBe(7);
    expect(deArtifacts?.letters).toContain('E');
    expect(deArtifacts?.letters).toContain('L');
  });

  it('treats ß and ẞ as two letters (SS) in word mask, length, and hint letter pool', () => {
    // buildWordMask produces 2 slots for ß
    const mask = buildWordMask('Fußball');
    expect(mask).toHaveLength(8);
    expect(mask).toEqual(['_', '_', '_', '_', '_', '_', '_', '_']);

    const maskCapital = buildWordMask('FUẞBALL');
    expect(maskCapital).toHaveLength(8);

    // buildHintLetters produces two separate 'S' bubbles instead of one 'SS' bubble
    const letters = buildHintLetters('Fußball');
    expect(letters).not.toContain('SS');
    const sCount = letters.filter((l) => l === 'S').length;
    expect(sCount).toBeGreaterThanOrEqual(2);
    // Every entry in hint letter pool must be a single letter
    expect(letters.every((l) => l.length === 1)).toBe(true);

    // resolveHintArtifacts produces length 8 and mask of length 8
    const translations = {
      de: { canonical: 'Fußball', synonyms: ['Kicken'] },
    };
    const artifacts = resolveHintArtifacts(translations, 'de', 'de', 'Fußball');
    expect(artifacts).not.toBeNull();
    expect(artifacts?.length).toBe(8);
    expect(artifacts?.mask).toHaveLength(8);
    expect(artifacts?.letters).not.toContain('SS');
    expect(artifacts?.letters.filter((l) => l === 'S').length).toBeGreaterThanOrEqual(2);
  });
});

describe('GuessArt Game Model & Player Management', () => {
  it('supports custom game name and updating players', () => {
    const players = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ];
    const game = {
      id: 'g-1',
      name: 'Spieleabend WG',
      players,
      roundNumber: 1,
      currentPlayerIndex: 0,
    };

    expect(game.name).toBe('Spieleabend WG');
    expect(game.players).toHaveLength(2);

    // Renaming Bob to Charlie
    const updatedPlayers = game.players.map((p) =>
      p.id === 'p2' ? { ...p, name: 'Charlie' } : p,
    );
    expect(updatedPlayers[1].name).toBe('Charlie');
    expect(updatedPlayers[1].id).toBe('p2');
  });
});

describe('GuessArt Catalogue Manager & Diffing', () => {
  it('calculates diff correctly when adding, modifying, and deleting items', async () => {
    const { calculateCatalogueDiff, generateLexiconTsCode } = await import('./catalogueManager');
    const { DEFAULT_CATEGORIES, DEFAULT_WORDS } = await import('./lexicon');

    // Add a new category and a new word
    const newCat = {
      id: 'cat_mythical',
      name: 'Mythical',
      translations: [
        { languageCode: 'en', name: 'Mythical' },
        { languageCode: 'de', name: 'Fabelwesen' },
      ],
    };
    const newWord = {
      id: 'w_dragon',
      categoryId: 'cat_mythical',
      word: 'Dragon',
      difficulty: 2,
      translations: {
        en: { canonical: 'Dragon', synonyms: ['Wyrm', 'Drake'] },
        de: { canonical: 'Drache', synonyms: ['Lindwurm'] },
      },
    };

    const updatedCategories = [...DEFAULT_CATEGORIES, newCat];
    const updatedWords = [...DEFAULT_WORDS, newWord];

    const diff = calculateCatalogueDiff(updatedCategories, updatedWords);
    expect(diff.addedCategories).toHaveLength(1);
    expect(diff.addedCategories[0].id).toBe('cat_mythical');
    expect(diff.addedWords).toHaveLength(1);
    expect(diff.addedWords[0].id).toBe('w_dragon');
    expect(diff.totalChanges).toBe(2);

    const tsCode = generateLexiconTsCode(updatedCategories, updatedWords);
    expect(tsCode).toContain('export const DEFAULT_CATEGORIES: CategoryItem[] =');
    expect(tsCode).toContain('cat_mythical');
    expect(tsCode).toContain('w_dragon');
  });
});


