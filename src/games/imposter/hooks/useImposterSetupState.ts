import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { DbCategory } from '../logic/types';
import { getImposterCategories } from '../logic/imposterRepository';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

export interface ImposterSetupSettings {
  imposterCount: number;
  isManualImposterCount: boolean;
  timerMinutes: number;
  timerSeconds: number;
  selectedCategoryIds: string[];
}

export interface ImposterStartOptions {
  categories: DbCategory[];
  imposterCount: number;
  timerLength: number;
}

const DEFAULT_SETTINGS: ImposterSetupSettings = {
  imposterCount: 1,
  isManualImposterCount: false,
  timerMinutes: 5,
  timerSeconds: 0,
  selectedCategoryIds: [],
};

export function useImposterSetupState(
  playerCount: number,
  onStartGame: (setup: ImposterStartOptions) => void,
) {
  const [allCategories, setAllCategories] = useState<DbCategory[]>([]);
  const [settings, setSettings] = useState<ImposterSetupSettings>(() =>
    storage.getJson<ImposterSetupSettings>(STORAGE_KEYS.IMPOSTER_SETTINGS, DEFAULT_SETTINGS),
  );

  useEffect(() => {
    const fetchCategories = async () => {
      const cats = await getImposterCategories();
      setAllCategories(cats);
      // If no categories were saved yet, default to all available categories
      setSettings((prev) =>
        prev.selectedCategoryIds.length === 0 && cats.length > 0
          ? { ...prev, selectedCategoryIds: cats.map((c) => c.id) }
          : prev,
      );
    };
    fetchCategories();
  }, []);

  const { imposterCount, isManualImposterCount, timerMinutes, timerSeconds, selectedCategoryIds } =
    settings;

  const resolvedImposterCount = isManualImposterCount
    ? imposterCount
    : Math.max(1, Math.floor(playerCount / 4));

  // Save settings to storage whenever they change
  useEffect(() => {
    storage.setJson(STORAGE_KEYS.IMPOSTER_SETTINGS, {
      ...settings,
      imposterCount: resolvedImposterCount,
    });
  }, [settings, resolvedImposterCount]);

  const start = () => {
    onStartGame({
      categories: allCategories.filter((c) => selectedCategoryIds.includes(c.id)),
      imposterCount: resolvedImposterCount,
      timerLength: timerMinutes * 60 + (timerSeconds || 0),
    });
  };

  const toggleCategory = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      selectedCategoryIds: prev.selectedCategoryIds.includes(id)
        ? prev.selectedCategoryIds.filter((cid) => cid !== id)
        : [...prev.selectedCategoryIds, id],
    }));
  };

  const selectAllCategories = () =>
    setSettings((prev) => ({ ...prev, selectedCategoryIds: allCategories.map((c) => c.id) }));

  const selectNoCategories = () => setSettings((prev) => ({ ...prev, selectedCategoryIds: [] }));

  const changeImposterCount = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setSettings((prev) => ({ ...prev, imposterCount: val, isManualImposterCount: true }));
    } else if (e.target.value === '') {
      setSettings((prev) => ({ ...prev, imposterCount: 0, isManualImposterCount: true }));
    }
  };

  const resetImposterCount = () =>
    setSettings((prev) => ({ ...prev, isManualImposterCount: false }));

  const changeTimerMinutes = (raw: string) =>
    setSettings((prev) => ({ ...prev, timerMinutes: Math.max(0, parseInt(raw) || 0) }));

  const changeTimerSeconds = (raw: string) =>
    setSettings((prev) => ({
      ...prev,
      timerSeconds: Math.max(0, Math.min(59, parseInt(raw) || 0)),
    }));

  return {
    allCategories,
    settings,
    start,
    toggleCategory,
    selectAllCategories,
    selectNoCategories,
    changeImposterCount,
    resetImposterCount,
    changeTimerMinutes,
    changeTimerSeconds,
  };
}
