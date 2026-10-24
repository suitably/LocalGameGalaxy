import React, { useState, useRef, useCallback } from 'react';

/** Drag-and-drop reordering state for a list; calls `onMove(from, to)` on drop. */
export function useQueueDrag(onMove: (fromIndex: number, toIndex: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }, []);

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = dragItemRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        onMove(fromIndex, toIndex);
      }
      reset();
    },
    [onMove, reset],
  );

  return {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd: reset,
  };
}
