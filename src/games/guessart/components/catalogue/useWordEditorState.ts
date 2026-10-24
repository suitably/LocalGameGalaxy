import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryItem, WordItem } from '../../logic/types';
import {
  EMPTY_WORD_FORM,
  buildWordFromForm,
  emptyFormFor,
  filterWords,
  formFromWord,
  type WordFormValues,
} from '../../logic/wordEditing';

const ITEMS_PER_PAGE = 20;

/** State and handlers of the catalogue word editor (filter, pagination, add/edit/delete). */
export const useWordEditorState = (
  categories: CategoryItem[],
  words: WordItem[],
  onChange: (words: WordItem[]) => void,
) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [wordToDelete, setWordToDelete] = useState<string | number | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [form, setForm] = useState<WordFormValues>(EMPTY_WORD_FORM);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredWords = useMemo(
    () => filterWords(words, selectedCategory, searchQuery),
    [words, selectedCategory, searchQuery],
  );

  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE) || 1;
  const paginatedWords = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWords, page]);

  const openForm = (word: WordItem | null) => {
    setIsNew(word === null);
    setEditingWord(word);
    setForm(word ? formFromWord(word, categories) : emptyFormFor(categories, selectedCategory));
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    const wordId = isNew
      ? `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      : editingWord?.id || `w_${Date.now()}`;
    const updatedWord = buildWordFromForm(form, wordId);
    if (!updatedWord) {
      setFeedback(
        t('guessart.canonicalNamesRequired', 'Hauptbegriff in Deutsch und Englisch erforderlich!'),
      );
      return;
    }
    onChange(
      isNew ? [updatedWord, ...words] : words.map((w) => (w.id === wordId ? updatedWord : w)),
    );
    setModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (wordToDelete === null) return;
    onChange(words.filter((w) => w.id !== wordToDelete));
    setWordToDelete(null);
  };

  return {
    selectedCategory,
    searchQuery,
    page,
    setPage,
    filteredWords,
    paginatedWords,
    totalPages,
    changeCategory: (id: string) => {
      setSelectedCategory(id);
      setPage(1);
    },
    changeSearch: (query: string) => {
      setSearchQuery(query);
      setPage(1);
    },
    wordToDelete,
    setWordToDelete,
    handleConfirmDelete,
    modalOpen,
    closeModal: () => setModalOpen(false),
    isNew,
    form,
    setForm,
    feedback,
    openAdd: () => openForm(null),
    openEdit: (word: WordItem) => openForm(word),
    handleSave,
  };
};
