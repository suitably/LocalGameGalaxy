/**
 * Floating Drag Overlay for Tabletop Dock Items [ID: COMP-TABLETOP-DOCK-DRAG-OVERLAY]
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import type { CardWidget, TokenWidget } from '../../logic/types';
import { CardFaceContent } from '../widgets/CardFaceContent';
import { TokenWidgetView } from '../widgets/TokenWidgetView';

export type DockDragItem =
  | { type: 'card'; card: CardWidget }
  | { type: 'piece'; piece: TokenWidget; groupName: string };

interface DockDragOverlayProps {
  item: DockDragItem | null;
  pointerPos: { x: number; y: number } | null;
}

export const DockDragOverlay: React.FC<DockDragOverlayProps> = ({ item, pointerPos }) => {
  if (!item || !pointerPos) return null;

  return createPortal(
    <Box
      sx={{
        position: 'fixed',
        left: pointerPos.x,
        top: pointerPos.y,
        pointerEvents: 'none',
        zIndex: 9999999,
        transform: 'translate(-50%, -50%) rotate(4deg) scale(1.08)',
        filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.6))',
        transition: 'none',
      }}
    >
      {item.type === 'card' ? (() => {
        const card = item.card;
        const showFaceObjects = Boolean(card.faceObjects && card.faceObjects.length > 0);
        const showBackFaceObjects = Boolean(card.backFaceObjects && card.backFaceObjects.length > 0);
        const isUnstyledContainer = Boolean(showFaceObjects || showBackFaceObjects || card.clipPath || card.isTransparent);

        return (
          <Box
            sx={{
              width: card.width || 80,
              height: card.height || 120,
              borderRadius: isUnstyledContainer ? 0 : 2,
              overflow: isUnstyledContainer ? 'visible' : 'hidden',
              border: isUnstyledContainer ? 'none' : '2px solid rgba(255, 255, 255, 0.8)',
              bgcolor: isUnstyledContainer ? 'transparent' : '#ffffff',
              clipPath: isUnstyledContainer && !showFaceObjects && !showBackFaceObjects ? card.clipPath : undefined,
              position: 'relative',
            }}
          >
            <CardFaceContent
              card={card}
              isFaceUp={true}
              width={card.width || 80}
              height={card.height || 120}
            />
          </Box>
        );
      })() : (
        <Box
          sx={{
            width: item.piece.width || 56,
            height: item.piece.height || 56,
            position: 'relative',
          }}
        >
          <TokenWidgetView
            widget={{
              ...item.piece,
              x: 0,
              y: 0,
            }}
            isDragging={true}
          />
        </Box>
      )}
    </Box>,
    document.body
  );
};
