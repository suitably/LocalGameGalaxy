import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWordDisplay, listCategories, listWordsForCategory } from '../logic/catalogueManager';
import type { CategoryItem, SelectWordPayload, WordItem } from '../logic/types';

/** Category/word browsing and manual-word submission for the drawer's word selection. */
export const useWordSelector = (
  onSelectWord: (payload: SelectWordPayload) => Promise<void>,
  manualModeDefault: boolean,
) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language.startsWith('de') ? 'de' : 'en';

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [categoriesLanguage, setCategoriesLanguage] = useState<string | null>(null);
  const [wordsLoading, setWordsLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [isManualMode, setIsManualMode] = useState<boolean>(manualModeDefault);
  const [manualWord, setManualWord] = useState<string>('');
  const [manualSynonyms, setManualSynonyms] = useState<string>('');

  useEffect(() => {
    let active = true;
    listCategories(language)
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch((e) => {
        console.error('Failed to load categories', e);
      })
      .finally(() => {
        if (active) setCategoriesLanguage(language);
      });
    return () => {
      active = false;
    };
  }, [language]);

  const selectCategory = async (category: CategoryItem) => {
    setSelectedCategory(category);
    setWordsLoading(true);
    try {
      setWords(await listWordsForCategory(category.id, language));
    } catch (e) {
      console.error('Failed to load words', e);
    } finally {
      setWordsLoading(false);
    }
  };

  const submit = async (payload: SelectWordPayload) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      await onSelectWord(payload);
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : t('guessart.genericError', 'An error occurred'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pickWord = (word: WordItem) =>
    submit({
      word: getWordDisplay(word, language),
      wordId: word.id,
      categoryId: word.categoryId,
      difficulty: word.difficulty || 2,
      translations: word.translations,
    });

  const submitManualWord = async () => {
    const trimmed = manualWord.trim();
    if (!trimmed) {
      setFeedback(t('guessart.manualWordRequired', 'Bitte gib ein Wort ein!'));
      return;
    }
    const synonyms = manualSynonyms
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await submit({
      word: trimmed,
      languageCode: language,
      difficulty: 3,
      translations: { [language]: { canonical: trimmed, synonyms } },
    });
  };

  const toggleManualMode = () => {
    setIsManualMode(!isManualMode);
    setSelectedCategory(null);
  };

  return {
    language,
    categories,
    selectedCategory,
    setSelectedCategory,
    words,
    loading: categoriesLanguage !== language || wordsLoading,
    submitting,
    feedback,
    setFeedback,
    isManualMode,
    toggleManualMode,
    manualWord,
    setManualWord,
    manualSynonyms,
    setManualSynonyms,
    selectCategory,
    pickWord,
    submitManualWord,
  };
};
