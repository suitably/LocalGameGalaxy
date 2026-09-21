/**
 * Floating Portal Drag Overlay for Tabletop Board items [ID: COMP-TABLETOP-BOARD-DRAG-OVERLAY]
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import type { CardWidget, TokenWidget, DieWidget, TabletopWidget } from '../../logic/types';
import { CardWidgetView } from '../widgets/CardWidgetView';
import { TokenWidgetView } from '../widgets/TokenWidgetView';
import { DieWidgetView } from '../widgets/DieWidgetView';

interface BoardDragOverlayProps {
  widget: TabletopWidget | null;
  pointerPos: { x: number; y: number } | null;
  grabOffset: { x: number; y: number };
  scale: number;
}

export const BoardDragOverlay: React.FC<BoardDragOverlayProps> = ({
  widget,
  pointerPos,
  grabOffset,
  scale,
}) => {
  if (!widget || !pointerPos) return null;

  const isOverDock = pointerPos.y >= window.innerHeight - 156;
  const effectiveScale = isOverDock ? Math.max(scale, 0.85) : scale;
  const left = pointerPos.x - grabOffset.x * (effectiveScale / (scale || 1));
  const top = pointerPos.y - grabOffset.y * (effectiveScale / (scale || 1));

  const rotation = 'rotation' in widget && typeof (widget as { rotation?: number }).rotation === 'number'
    ? (widget as { rotation?: number }).rotation || 0
    : 0;

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
          width: widget.width,
          height: widget.height,
          transform: `scale(${effectiveScale}) rotate(${rotation}deg)`,
          transformOrigin: 'top left',
          position: 'relative',
        }}
      >
        {widget.type === 'card' && (
          <CardWidgetView
            widget={{ ...(widget as CardWidget), x: 0, y: 0 }}
            isDragging={false}
          />
        )}
        {widget.type === 'token' && (
          <TokenWidgetView
            widget={{ ...(widget as TokenWidget), x: 0, y: 0 }}
            isDragging={true}
          />
        )}
        {widget.type === 'die' && (
          <DieWidgetView
            widget={{ ...(widget as DieWidget), x: 0, y: 0 }}
            isDragging={true}
          />
        )}
      </Box>
    </Box>,
    document.body
  );
};
