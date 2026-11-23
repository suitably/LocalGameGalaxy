import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMemoryDb } from './memoryDb.testUtils';
import {
  addSynonymToWord,
  calculateCatalogueDiff,
  ensureCatalogueEntry,
  generateLexiconTsCode,
  getCachedCatalogue,
  getCategoryName,
  getMasterCatalogue,
  getWordDisplay,
  listCategories,
  listWordsForCategory,
  resetMasterCatalogue,
  saveMasterCatalogue,
} from './catalogueManager';
import { DEFAULT_CATEGORIES, DEFAULT_WORDS } from './lexicon';
import type { CategoryItem, WordItem } from './types';

vi.mock('./db', () => import('./memoryDb.testUtils'));

const category = (id: string, fields: Partial<CategoryItem> = {}): CategoryItem =>
  ({ id, name: id, translations: [], ...fields }) as CategoryItem;

const word = (id: string, fields: Partial<WordItem> = {}): WordItem =>
  ({
    id,
    categoryId: 'cat_custom',
    word: id,
    difficulty: 2,
    translations: {},
    ...fields,
  }) as WordItem;

beforeEach(() => {
  resetMemoryDb();
});

describe('master catalogue persistence', () => {
  it('falls back to the default lexicon when nothing is stored', async () => {
    const master = await getMasterCatalogue();
    expect(master.id).toBe('master');
    expect(master.categories).toEqual(DEFAULT_CATEGORIES);
    expect(master.words).toEqual(DEFAULT_WORDS);
  });

  it('returns what saveMasterCatalogue stored', async () => {
    const cats = [category('cat_custom')];
    const words = [word('w_custom')];
    const saved = await saveMasterCatalogue(cats, words);
    expect(saved).toMatchObject({ id: 'master', version: 1, categories: cats, words });
    const loaded = await getMasterCatalogue();
    expect(loaded.categories).toEqual(cats);
    expect(loaded.words).toEqual(words);
  });

  it('resetMasterCatalogue restores the defaults', async () => {
    await saveMasterCatalogue([category('only')], []);
    const reset = await resetMasterCatalogue();
    expect(reset.categories).toEqual(DEFAULT_CATEGORIES);
    expect((await getMasterCatalogue()).words).toEqual(DEFAULT_WORDS);
  });

  it('saving drops cached per-language entries so they are re-indexed', async () => {
    await saveMasterCatalogue([category('cat_a')], [word('w1', { categoryId: 'cat_a' })]);
    expect(Object.keys((await ensureCatalogueEntry('en')).wordsByCategory)).toEqual(['cat_a']);
    await saveMasterCatalogue([category('cat_b')], []);
    expect(Object.keys((await ensureCatalogueEntry('en')).wordsByCategory)).toEqual(['cat_b']);
  });
});

describe('per-language catalogue cache', () => {
  it('groups words by category, keeping empty categories', async () => {
    await saveMasterCatalogue(
      [category('cat_a'), category('cat_b')],
      [
        word('w1', { categoryId: 'cat_a' }),
        word('w2', { categoryId: 'cat_a' }),
        word('w3', { categoryId: 'cat_zzz' }),
      ],
    );
    const entry = await ensureCatalogueEntry('en');
    expect(entry.language).toBe('en');
    expect(entry.wordsByCategory.cat_a.map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(entry.wordsByCategory.cat_b).toEqual([]);
    // words of unknown categories get their own bucket instead of being dropped
    expect(entry.wordsByCategory.cat_zzz.map((w) => w.id)).toEqual(['w3']);
  });

  it('files words without a category under cat_objects', async () => {
    await saveMasterCatalogue([], [word('w1', { categoryId: undefined })]);
    const entry = await ensureCatalogueEntry('en');
    expect(entry.wordsByCategory.cat_objects.map((w) => w.id)).toEqual(['w1']);
  });

  it('normalizes the language code and reuses the cached entry', async () => {
    await saveMasterCatalogue([category('cat_a')], []);
    const first = await ensureCatalogueEntry('de-DE');
    const second = await getCachedCatalogue('de-DE');
    expect(second.downloadedAt).toBe(first.downloadedAt);
    expect(first.language).toBe(second.language);
  });

  it('defaults an empty language to en', async () => {
    expect((await ensureCatalogueEntry('')).language).toBe('en');
  });

  it('listCategories and listWordsForCategory read from the cache', async () => {
    const cats = [category('cat_a'), category('cat_b')];
    await saveMasterCatalogue(cats, [word('w1', { categoryId: 'cat_a' })]);
    expect((await listCategories('en')).map((c) => c.id)).toEqual(['cat_a', 'cat_b']);
    expect((await listWordsForCategory('cat_a', 'en')).map((w) => w.id)).toEqual(['w1']);
    expect(await listWordsForCategory('unknown', 'en')).toEqual([]);
  });

  it('accepts numeric category ids', async () => {
    await saveMasterCatalogue(
      [category('7')],
      [word('w1', { categoryId: '7' as unknown as WordItem['categoryId'] })],
    );
    expect((await listWordsForCategory(7, 'en')).map((w) => w.id)).toEqual(['w1']);
  });
});

describe('display helpers', () => {
  const cat = category('cat_a', {
    name: 'Fallback',
    translations: [
      { languageCode: 'en', name: 'Animals' },
      { languageCode: 'de', name: 'Tiere' },
    ],
  });

  it('getCategoryName prefers the translation, then name, then id', () => {
    expect(getCategoryName(cat, 'de')).toBe('Tiere');
    expect(getCategoryName(cat, ' EN ')).toBe('Animals');
    expect(getCategoryName(cat, 'fr')).toBe('Fallback');
    expect(getCategoryName({ id: 'x', name: '' } as CategoryItem, 'fr')).toBe('x');
  });

  // Suspected bug: only trim+lowercase is applied, so a regional code such as 'en-US' misses the
  // 'en' translation and falls back to the plain name (the engine uses shortLanguageCode instead).
  it.todo('getCategoryName resolves regional language codes such as en-US to en');

  it('getWordDisplay prefers the language, then any translation, then the base word', () => {
    const w = word('w', {
      word: 'Base',
      translations: {
        en: { canonical: 'Dog', synonyms: [] },
        de: { canonical: 'Hund', synonyms: [] },
      },
    });
    expect(getWordDisplay(w, 'de')).toBe('Hund');
    expect(getWordDisplay(w, 'fr')).toBe('Dog');
    expect(getWordDisplay(word('b', { word: 'Base' }), 'de')).toBe('Base');
    expect(getWordDisplay(word('e', { word: '' }), 'de')).toBe('???');
  });
});

describe('addSynonymToWord', () => {
  const dog = word('w_dog', {
    word: 'Dog',
    translations: {
      en: { canonical: 'Dog', synonyms: ['Puppy'] },
      de: { canonical: 'Hund', synonyms: [] },
    },
  });

  beforeEach(async () => {
    await saveMasterCatalogue([category('cat_custom')], [dog, word('w_other')]);
  });

  it('rejects an empty synonym', async () => {
    expect(await addSynonymToWord('w_dog', '   ')).toEqual({
      success: false,
      message: 'Empty synonym',
    });
  });

  it('reports an unknown word', async () => {
    const result = await addSynonymToWord('nothing', 'x');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Word not found in catalogue');
  });

  it('finds the word by id, base word or canonical translation (case-insensitive)', async () => {
    for (const key of ['W_DOG', 'dog', 'hund']) {
      const result = await addSynonymToWord(key, `syn-${key}`, 'de');
      expect(result.success).toBe(true);
      expect(result.word?.id).toBe('w_dog');
    }
  });

  it('adds a trimmed synonym in the language and persists it', async () => {
    const result = await addSynonymToWord('w_dog', '  Waldi ', 'de');
    expect(result.word?.translations?.de.synonyms).toEqual(['Waldi']);
    expect(result.word?.translations?.en.synonyms).toEqual(['Puppy']);
    const stored = (await getMasterCatalogue()).words.find((w) => w.id === 'w_dog');
    expect(stored?.translations?.de.synonyms).toEqual(['Waldi']);
    expect((await getMasterCatalogue()).words).toHaveLength(2);
  });

  it('does not duplicate an existing synonym or the canonical form', async () => {
    const dup = await addSynonymToWord('w_dog', 'PUPPY', 'en');
    expect(dup).toMatchObject({ success: true, message: 'Synonym already exists' });
    const canonical = await addSynonymToWord('w_dog', 'hund', 'de');
    expect(canonical.message).toBe('Synonym already exists');
    expect(
      (await getMasterCatalogue()).words.find((w) => w.id === 'w_dog')?.translations?.en.synonyms,
    ).toEqual(['Puppy']);
  });

  it('creates a translation entry for a new language from the base word', async () => {
    const result = await addSynonymToWord('w_dog', 'Chien', 'fr');
    expect(result.word?.translations?.fr).toMatchObject({
      canonical: 'Dog',
      synonyms: ['Chien'],
    });
  });
});

describe('calculateCatalogueDiff', () => {
  it('reports no changes for the default lexicon', () => {
    const diff = calculateCatalogueDiff(DEFAULT_CATEGORIES, DEFAULT_WORDS);
    expect(diff.totalChanges).toBe(0);
  });

  it('detects modified and deleted categories and words', () => {
    const [firstCat, ...restCats] = DEFAULT_CATEGORIES;
    const [firstWord, ...restWords] = DEFAULT_WORDS;
    const modifiedCat = { ...restCats[0], name: 'Renamed' };
    const modifiedWord = { ...restWords[0], difficulty: 5 } as WordItem;
    const diff = calculateCatalogueDiff(
      [modifiedCat, ...restCats.slice(1)],
      [modifiedWord, ...restWords.slice(1)],
    );
    expect(diff.deletedCategories.map((c) => c.id)).toEqual([firstCat.id]);
    expect(diff.modifiedCategories.map((c) => c.id)).toEqual([restCats[0].id]);
    expect(diff.deletedWords.map((w) => w.id)).toEqual([firstWord.id]);
    expect(diff.modifiedWords.map((w) => w.id)).toEqual([restWords[0].id]);
    expect(diff.addedCategories).toEqual([]);
    expect(diff.addedWords).toEqual([]);
    expect(diff.totalChanges).toBe(4);
  });

  it('treats an empty catalogue as everything deleted', () => {
    const diff = calculateCatalogueDiff([], []);
    expect(diff.totalChanges).toBe(DEFAULT_CATEGORIES.length + DEFAULT_WORDS.length);
  });
});

describe('generateLexiconTsCode', () => {
  it('emits both exports with the data as JSON', () => {
    const code = generateLexiconTsCode([category('cat_x')], [word('w_x')]);
    expect(code.startsWith("import type { CategoryItem, WordItem } from './types';")).toBe(true);
    expect(code).toContain('export const DEFAULT_CATEGORIES: CategoryItem[] = [');
    expect(code).toContain('export const DEFAULT_WORDS: WordItem[] = [');
    expect(code).toContain('"id": "cat_x"');
    expect(code).toContain('"id": "w_x"');
    expect(code.endsWith('];\n')).toBe(true);
  });
});
