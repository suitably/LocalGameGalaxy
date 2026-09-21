/**
 * Floating Drag Overlay for Tabletop Dock Items [ID: COMP-TABLETOP-DOCK-DRAG-OVERLAY]
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import type { CardWidget, TokenWidget } from '../../logic/types';
import { CardWidgetView } from '../widgets/CardWidgetView';
import { TokenWidgetView } from '../widgets/TokenWidgetView';

export type DockDragItem =
  | { type: 'card'; card: CardWidget }
  | { type: 'piece'; piece: TokenWidget; groupName: string };

interface DockDragOverlayProps {
  item: DockDragItem | null;
  pointerPos: { x: number; y: number } | null;
  grabOffset?: { x: number; y: number };
  scale?: number;
}

export const DockDragOverlay: React.FC<DockDragOverlayProps> = ({
  item,
  pointerPos,
  grabOffset = { x: 0, y: 0 },
  scale = 1,
}) => {
  if (!item || !pointerPos) return null;

  const isOverDock = pointerPos.y >= window.innerHeight - 156;
  const effectiveScale = isOverDock ? Math.max(scale, 0.85) : scale;
  const left = pointerPos.x - grabOffset.x * (effectiveScale / (scale || 1));
  const top = pointerPos.y - grabOffset.y * (effectiveScale / (scale || 1));

  const widget = item.type === 'card' ? item.card : item.piece;
  const width = widget.width || (item.type === 'card' ? 80 : 56);
  const height = widget.height || (item.type === 'card' ? 120 : 56);
  const rotation = typeof widget.rotation === 'number' ? widget.rotation : 0;

  return createPortal(
    <Box
      sx={{
        position: 'fixed',
        left,
        top,
        pointerEvents: 'none',
        zIndex: 9999999,
        transformOrigin: 'top left',
        filter: isOverDock
          ? 'drop-shadow(0 16px 32px rgba(59, 130, 246, 0.5)) drop-shadow(0 8px 16px rgba(0,0,0,0.6))'
          : 'drop-shadow(0 14px 28px rgba(0,0,0,0.65))',
        transition: isOverDock ? 'transform 0.15s ease, filter 0.15s ease' : 'none',
      }}
    >
      <Box
        sx={{
          width,
          height,
          transform: `scale(${effectiveScale}) rotate(${rotation}deg)`,
          transformOrigin: 'top left',
          position: 'relative',
        }}
      >
        {item.type === 'card' ? (
          <CardWidgetView
            widget={{ ...item.card, x: 0, y: 0, faceUp: true }}
            isDragging={false}
          />
        ) : (
          <TokenWidgetView
            widget={{ ...item.piece, x: 0, y: 0 }}
            isDragging={true}
          />
        )}
      </Box>
    </Box>,
    document.body
  );
};
