import { useCallback, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { MelodiqNotesViewMode, ModernViewSubMode } from '../types';

export type SheetRenderMode = 'horizontal' | 'vertical';

/** Persisted view mode (classic sheet vs. modern highway) and sheet layout. */
export const useViewPreferences = () => {
  const [viewMode, setViewMode] = useState<MelodiqNotesViewMode>(() =>
    storage.get(STORAGE_KEYS.MELODIQ_NOTES_VIEW_MODE, 'classic') === 'modern'
      ? 'modern'
      : 'classic',
  );
  const [sheetRenderMode, setSheetRenderModeState] = useState<SheetRenderMode>(() =>
    storage.get(STORAGE_KEYS.MELODIQ_NOTES_SHEET_RENDER_MODE, 'vertical') === 'horizontal'
      ? 'horizontal'
      : 'vertical',
  );
  const [modernSubMode, setModernSubMode] = useState<ModernViewSubMode>('focus');

  const handleViewModeChange = useCallback((mode: MelodiqNotesViewMode) => {
    setViewMode(mode);
    storage.set(STORAGE_KEYS.MELODIQ_NOTES_VIEW_MODE, mode);
  }, []);

  const setSheetRenderMode = useCallback((mode: SheetRenderMode) => {
    setSheetRenderModeState(mode);
    storage.set(STORAGE_KEYS.MELODIQ_NOTES_SHEET_RENDER_MODE, mode);
  }, []);

  return {
    viewMode,
    handleViewModeChange,
    sheetRenderMode,
    setSheetRenderMode,
    modernSubMode,
    setModernSubMode,
  };
};
