import { useEffect, useState } from 'react';
import {
  getMasterCatalogue,
  resetMasterCatalogue,
  saveMasterCatalogue,
} from '../../logic/catalogueManager';
import type { CategoryItem, WordItem } from '../../logic/types';

/** Loads the master catalogue while the dialog is open and persists category/word edits. */
export const useCatalogueEditor = (open: boolean, onCatalogueUpdated?: () => void) => {
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [words, setWords] = useState<WordItem[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getMasterCatalogue()
      .then((master) => {
        if (cancelled) return;
        setCategories(master.categories);
        setWords(master.words);
      })
      .catch((err) => {
        console.error('Failed to load master catalogue', err);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
      setLoaded(false);
    };
  }, [open]);

  const handleCategoriesChange = async (newCats: CategoryItem[], newWords: WordItem[]) => {
    setCategories(newCats);
    setWords(newWords);
    await saveMasterCatalogue(newCats, newWords);
    onCatalogueUpdated?.();
  };

  const handleWordsChange = async (newWords: WordItem[]) => {
    setWords(newWords);
    await saveMasterCatalogue(categories, newWords);
    onCatalogueUpdated?.();
  };

  const handleConfirmReset = async () => {
    setConfirmResetOpen(false);
    setResetting(true);
    try {
      const restored = await resetMasterCatalogue();
      setCategories(restored.categories);
      setWords(restored.words);
      onCatalogueUpdated?.();
    } catch (err) {
      console.error('Failed to reset catalogue', err);
    } finally {
      setResetting(false);
    }
  };

  return {
    tabIndex,
    setTabIndex,
    categories,
    words,
    loading: !loaded || resetting,
    confirmResetOpen,
    setConfirmResetOpen,
    handleCategoriesChange,
    handleWordsChange,
    handleConfirmReset,
  };
};
