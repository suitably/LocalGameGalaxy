/**
 * Ctrl/Cmd + ] / [ reorder the selected widgets, Shift sends them to the front / back
 * (as in Figma and Photoshop) [ID: HOOK-TABLETOP-ZORDER-SHORTCUTS]
 */
import { useCallback, useEffect } from 'react';
import type { TabletopAction } from '../logic/tabletopReducer';
import type { ZOrderOp } from '../logic/zOrder';

/** Maps a key press to a z-order operation; `}` and `{` are Shift+`]` / Shift+`[`. */
export function zOrderOpForKey(
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
): ZOrderOp | null {
  if (!(e.ctrlKey || e.metaKey)) return null;
  const up = e.key === ']' || e.key === '}';
  const down = e.key === '[' || e.key === '{';
  if (up) return e.shiftKey ? 'front' : 'forward';
  if (down) return e.shiftKey ? 'back' : 'backward';
  return null;
}

export function useZOrderShortcuts(
  selectedIds: string[],
  dispatch: React.Dispatch<TabletopAction>,
) {
  /** Context menu: a widget inside the selection moves the whole selection, else only itself. */
  const reorderWidget = useCallback(
    (id: string, op: ZOrderOp) => {
      const widgetIds = selectedIds.includes(id) ? selectedIds : [id];
      dispatch({ type: 'SET_Z_ORDER', payload: { widgetIds, op } });
    },
    [selectedIds, dispatch],
  );

  useEffect(() => {
    if (selectedIds.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const op = zOrderOpForKey(e);
      if (!op) return;
      e.preventDefault();
      dispatch({ type: 'SET_Z_ORDER', payload: { widgetIds: selectedIds, op } });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, dispatch]);

  return reorderWidget;
}
