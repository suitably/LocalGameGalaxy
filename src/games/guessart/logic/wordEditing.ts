import type { CategoryItem, WordItem } from './types';

export interface WordFormValues {
  categoryId: string;
  difficulty: number;
  deCanonical: string;
  deSynonyms: string;
  enCanonical: string;
  enSynonyms: string;
}

export const EMPTY_WORD_FORM: WordFormValues = {
  categoryId: '',
  difficulty: 2,
  deCanonical: '',
  deSynonyms: '',
  enCanonical: '',
  enSynonyms: '',
};

const FALLBACK_CATEGORY_ID = 'cat_objects';

/** Case-insensitive filter over category and German/English canonical words and synonyms. */
export const filterWords = (
  words: WordItem[],
  categoryId: string,
  searchQuery: string,
): WordItem[] => {
  const query = searchQuery.trim().toLowerCase();
  return words.filter((w) => {
    if (categoryId !== 'all' && String(w.categoryId) !== categoryId) return false;
    if (!query) return true;

    const deWord = w.translations?.de?.canonical?.toLowerCase() || '';
    const deSyn = (w.translations?.de?.synonyms || []).join(' ').toLowerCase();
    const enWord = w.translations?.en?.canonical?.toLowerCase() || w.word?.toLowerCase() || '';
    const enSyn = (w.translations?.en?.synonyms || []).join(' ').toLowerCase();
    return [deWord, deSyn, enWord, enSyn].some((field) => field.includes(query));
  });
};

/** Default form for a new word; preselects the active category filter or the first category. */
export const emptyFormFor = (
  categories: CategoryItem[],
  selectedCategory: string,
): WordFormValues => ({
  ...EMPTY_WORD_FORM,
  categoryId:
    selectedCategory !== 'all'
      ? selectedCategory
      : String(categories[0]?.id || FALLBACK_CATEGORY_ID),
});

export const formFromWord = (word: WordItem, categories: CategoryItem[]): WordFormValues => ({
  categoryId: String(word.categoryId || categories[0]?.id || FALLBACK_CATEGORY_ID),
  difficulty: word.difficulty || 2,
  deCanonical: word.translations?.de?.canonical || '',
  deSynonyms: (word.translations?.de?.synonyms || []).join(', '),
  enCanonical: word.translations?.en?.canonical || word.word || '',
  enSynonyms: (word.translations?.en?.synonyms || []).join(', '),
});

/**
 * Builds the stored word from the form, or `null` when a canonical name is missing.
 * Synonyms equal to the German canonical term are dropped (applies to both languages).
 */
export const buildWordFromForm = (form: WordFormValues, id: string | number): WordItem | null => {
  const deCanonical = form.deCanonical.trim();
  const enCanonical = form.enCanonical.trim();
  if (!deCanonical || !enCanonical) return null;

  const parseSynonyms = (str: string) =>
    str
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.toLowerCase() !== deCanonical.toLowerCase());

  return {
    id,
    categoryId: form.categoryId,
    word: enCanonical,
    difficulty: form.difficulty,
    translations: {
      de: { canonical: deCanonical, synonyms: parseSynonyms(form.deSynonyms) },
      en: { canonical: enCanonical, synonyms: parseSynonyms(form.enSynonyms) },
    },
  };
};
