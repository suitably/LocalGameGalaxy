/**
 * Hook for managing widget selection and scaling [ID: HOOK-TABLETOP-SELECTION]
 */
import { useState, useCallback, useMemo } from 'react';
import type { TabletopAction } from '../logic/tabletopReducer';

const NONE: ReadonlySet<string> = new Set();

export interface UseTabletopSelectionOptions {
  dispatch: React.Dispatch<TabletopAction>;
  /** Widgets in hidden zones the viewer may not see: never selectable (#551). */
  obscuredIds?: ReadonlySet<string>;
}

export function useTabletopSelection({
  dispatch,
  obscuredIds = NONE,
}: UseTabletopSelectionOptions) {
  const [rawSelection, setSelectedWidgetIds] = useState<string[]>([]);
  // A selected widget that moves into a hidden zone drops out of the selection.
  const selectedWidgetIds = useMemo(
    () => rawSelection.filter((id) => !obscuredIds.has(id)),
    [rawSelection, obscuredIds],
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedWidgetIds([]);
      }
      return !prev;
    });
  }, []);

  const handleWidgetClick = useCallback(
    (widgetId: string, isShiftKey: boolean): boolean => {
      // If shift key or selection mode is active, handle selection
      if (isShiftKey || isSelectionMode) {
        if (obscuredIds.has(widgetId)) return true; // consumed, but hidden widgets stay unselected
        setSelectedWidgetIds((prev) =>
          prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId],
        );
        return true; // Handled selection
      }
      return false; // Normal click
    },
    [isSelectionMode, obscuredIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedWidgetIds([]);
  }, []);

  const selectAll = useCallback(
    (ids: string[]) => setSelectedWidgetIds(ids.filter((id) => !obscuredIds.has(id))),
    [obscuredIds],
  );

  const scaleSelected = useCallback(
    (factor: number) => {
      if (selectedWidgetIds.length === 0) return;
      dispatch({
        type: 'SCALE_WIDGETS',
        payload: { widgetIds: selectedWidgetIds, factor },
      });
    },
    [dispatch, selectedWidgetIds],
  );

  const resetScaleSelected = useCallback(() => {
    if (selectedWidgetIds.length === 0) return;
    dispatch({
      type: 'RESET_WIDGET_SCALE',
      payload: { widgetIds: selectedWidgetIds },
    });
  }, [dispatch, selectedWidgetIds]);

  return {
    selectedWidgetIds,
    isSelectionMode,
    toggleSelectionMode,
    handleWidgetClick,
    clearSelection,
    selectAll,
    scaleSelected,
    resetScaleSelected,
  };
}
