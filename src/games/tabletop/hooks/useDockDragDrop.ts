/**
 * Hook for managing Drag and Drop from the Dock onto the Tabletop Canvas [ID: HOOK-TABLETOP-DOCK-DRAG]
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { TabletopAction } from '../logic/tabletopReducer';
import type { CardWidget, TokenWidget } from '../logic/types';
import type { DockDragItem } from '../components/surface/DockDragOverlay';

interface UseDockDragDropOptions {
  tableWidth: number;
  tableHeight: number;
  dispatch: React.Dispatch<TabletopAction>;
}

export function useDockDragDrop({ tableWidth, tableHeight, dispatch }: UseDockDragDropOptions) {
  const [draggingItem, setDraggingItem] = useState<DockDragItem | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const startRef = useRef<{
    startX: number;
    startY: number;
    item: DockDragItem;
    onClick?: () => void;
    hasMoved: boolean;
  } | null>(null);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.startX;
    const dy = e.clientY - startRef.current.startY;
    const dist = Math.hypot(dx, dy);

    if (dist >= 6) {
      startRef.current.hasMoved = true;
      setIsDragging(true);
      setPointerPos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!startRef.current) return;
    const { hasMoved, item, onClick } = startRef.current;

    if (!hasMoved) {
      onClick?.();
    } else {
      const isOverBoard = e.clientY < window.innerHeight - 140;
      if (isOverBoard) {
        const boardEl = document.getElementById('tabletop-board-canvas');
        if (boardEl) {
          const rect = boardEl.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const rawBoardX = (e.clientX - rect.left) * (tableWidth / rect.width);
            const rawBoardY = (e.clientY - rect.top) * (tableHeight / rect.height);

            if (item.type === 'card') {
              const cardW = item.card.width || 80;
              const cardH = item.card.height || 120;
              const posX = Math.round(Math.max(10, Math.min(tableWidth - cardW - 10, rawBoardX - cardW / 2)));
              const posY = Math.round(Math.max(10, Math.min(tableHeight - cardH - 10, rawBoardY - cardH / 2)));
              dispatch({
                type: 'PLAY_CARD_FROM_HAND',
                payload: {
                  cardId: item.card.id,
                  position: { x: posX, y: posY },
                },
              });
            } else if (item.type === 'piece') {
              const pieceW = item.piece.width || 56;
              const pieceH = item.piece.height || 56;
              const posX = Math.round(Math.max(10, Math.min(tableWidth - pieceW - 10, rawBoardX - pieceW / 2)));
              const posY = Math.round(Math.max(10, Math.min(tableHeight - pieceH - 10, rawBoardY - pieceH / 2)));
              dispatch({
                type: 'TAKE_PIECE_FROM_SUPPLY',
                payload: {
                  pieceId: item.piece.id,
                  targetPosition: { x: posX, y: posY },
                },
              });
            }
          }
        }
      }
    }

    startRef.current = null;
    setDraggingItem(null);
    setPointerPos(null);
    setIsDragging(false);
  }, [tableWidth, tableHeight, dispatch]);

  useEffect(() => {
    if (draggingItem) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [draggingItem, handlePointerMove, handlePointerUp]);

  const startCardDrag = useCallback((e: React.PointerEvent, card: CardWidget, onClick?: () => void) => {
    if (e.button !== 0) return;
    const item: DockDragItem = { type: 'card', card };
    startRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      item,
      onClick,
      hasMoved: false,
    };
    setDraggingItem(item);
  }, []);

  const startPieceDrag = useCallback((e: React.PointerEvent, piece: TokenWidget, groupName: string, onClick?: () => void) => {
    if (e.button !== 0) return;
    const item: DockDragItem = { type: 'piece', piece, groupName };
    startRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      item,
      onClick,
      hasMoved: false,
    };
    setDraggingItem(item);
  }, []);

  return {
    draggingItem,
    pointerPos: isDragging ? pointerPos : null,
    isDragging,
    startCardDrag,
    startPieceDrag,
  };
}
