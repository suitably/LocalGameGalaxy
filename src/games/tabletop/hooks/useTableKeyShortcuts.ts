/**
 * F flips, S shuffles / rolls the widget under the pointer or in hand [ID: HOOK-TABLETOP-KEY-SHORTCUTS]
 */
import { useCallback, useEffect, useRef } from 'react';
import type { TabletopAction } from '../logic/tabletopReducer';
import type { TabletopWidget } from '../logic/types';
import { tableKeyAction } from '../logic/tableGestures';

export function useTableKeyShortcuts(
  widgets: Record<string, TabletopWidget>,
  /** Widget being dragged right now, if any; wins over the hovered one. */
  draggedId: string | null,
  dispatch: React.Dispatch<TabletopAction>,
) {
  const hoveredRef = useRef<string | null>(null);

  /** Surface `onPointerOver`: remembers the widget under the pointer. */
  const trackHover = useCallback((e: React.PointerEvent) => {
    const el = (e.target as Element | null)?.closest?.('[data-widget-id]');
    hoveredRef.current = el?.getAttribute('data-widget-id') ?? null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      )
        return;
      const id = draggedId ?? hoveredRef.current;
      const action = tableKeyAction(e.key, id ? widgets[id] : undefined, e);
      if (!action) return;
      e.preventDefault();
      dispatch(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [widgets, draggedId, dispatch]);

  return trackHover;
}
