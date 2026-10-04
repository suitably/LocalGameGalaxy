/**
 * Hook for managing widget selection and scaling [ID: HOOK-TABLETOP-SELECTION]
 */
import { useState, useCallback } from 'react';
import type { TabletopAction } from '../logic/tabletopReducer';

export interface UseTabletopSelectionOptions {
  dispatch: React.Dispatch<TabletopAction>;
}

export function useTabletopSelection({ dispatch }: UseTabletopSelectionOptions) {
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
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
        setSelectedWidgetIds((prev) =>
          prev.includes(widgetId)
            ? prev.filter((id) => id !== widgetId)
            : [...prev, widgetId],
        );
        return true; // Handled selection
      }
      return false; // Normal click
    },
    [isSelectionMode],
  );

  const clearSelection = useCallback(() => {
    setSelectedWidgetIds([]);
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedWidgetIds(ids);
  }, []);

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
