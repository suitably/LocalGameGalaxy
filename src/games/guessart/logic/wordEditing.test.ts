import { describe, it, expect } from 'vitest';
import {
  buildWordFromForm,
  emptyFormFor,
  filterWords,
  formFromWord,
  EMPTY_WORD_FORM,
} from './wordEditing';
import type { CategoryItem, WordItem } from './types';

const dog: WordItem = {
  id: 'w1',
  categoryId: 'animals',
  word: 'Dog',
  difficulty: 1,
  translations: {
    de: { canonical: 'Hund', synonyms: ['Köter'] },
    en: { canonical: 'Dog', synonyms: ['Hound'] },
  },
};
const house: WordItem = { id: 'w2', categoryId: 'places', word: 'House' };
const categories: CategoryItem[] = [{ id: 'animals', name: 'Animals' }];

describe('filterWords', () => {
  it('filters by category and query across languages and synonyms', () => {
    expect(filterWords([dog, house], 'all', '')).toHaveLength(2);
    expect(filterWords([dog, house], 'places', '')).toEqual([house]);
    expect(filterWords([dog, house], 'all', ' KÖTER ')).toEqual([dog]);
    expect(filterWords([dog, house], 'all', 'house')).toEqual([house]);
    expect(filterWords([dog, house], 'animals', 'house')).toEqual([]);
  });
});

describe('form helpers', () => {
  it('preselects the filter category or the first category', () => {
    expect(emptyFormFor(categories, 'places').categoryId).toBe('places');
    expect(emptyFormFor(categories, 'all').categoryId).toBe('animals');
    expect(emptyFormFor([], 'all').categoryId).toBe('cat_objects');
  });

  it('round-trips a word through the form', () => {
    const form = formFromWord(dog, categories);
    expect(form).toMatchObject({ deSynonyms: 'Köter', enCanonical: 'Dog', difficulty: 1 });
    expect(buildWordFromForm(form, 'w1')).toEqual(dog);
  });

  it('rejects missing canonical names and drops synonyms equal to the German term', () => {
    expect(buildWordFromForm({ ...EMPTY_WORD_FORM, deCanonical: 'Hund' }, 'x')).toBeNull();
    const built = buildWordFromForm(
      { ...EMPTY_WORD_FORM, deCanonical: 'Hund', enCanonical: 'Dog', deSynonyms: 'hund, Welpe, ' },
      'x',
    );
    expect(built?.translations?.de?.synonyms).toEqual(['Welpe']);
  });
});
