/**
 * Per-pointer-move drag state outside React state [ID: HOOK-TABLETOP-DRAG-FRAME]
 *
 * The pointer and the live board position change on every pointer move. Kept in React state they
 * re-rendered the whole table surface (toolbar, menus, 800 widget elements) each time; in this
 * store only the subscribers that draw the drag (the overlay, a dragged widget) re-render (#684).
 */
import { useCallback, useSyncExternalStore } from 'react';

export interface DragPosition {
  id: string;
  x: number;
  y: number;
}

export interface DragFrame {
  /** Pointer in client coordinates. */
  pointer: { x: number; y: number };
  /** Board position of the dragged widget; null while a source is only pressed. */
  position: DragPosition | null;
}

export interface DragFrameStore {
  get: () => DragFrame | null;
  set: (frame: DragFrame | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createDragFrameStore(): DragFrameStore {
  let frame: DragFrame | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => frame,
    set(next) {
      if (next === frame) return;
      frame = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Subscribes to a slice of the drag frame; `select` must return a stable value when unchanged. */
export function useDragFrame<T>(store: DragFrameStore, select: (frame: DragFrame | null) => T): T {
  const read = useCallback(() => select(store.get()), [store, select]);
  return useSyncExternalStore(store.subscribe, read, read);
}
