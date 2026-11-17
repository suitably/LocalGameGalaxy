/**
 * Fanned-out stack: the top cards side by side, each one's face visible (Skip-Bo style) [ID: GAME-TABLETOP-STACK-FAN-VIEW]
 */
import React from 'react';
import { alpha, Box } from '@mui/material';
import type { CardWidget, DeckWidget } from '../../logic/types';
import { CardFaceContent } from './CardFaceContent';

/** Share of a card's width that stays visible of every card but the top one. */
const FAN_STEP = 0.3;

interface StackFanViewProps {
  widget: DeckWidget;
  /** Bottom to top. */
  cards: CardWidget[];
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const StackFanView: React.FC<StackFanViewProps> = ({
  widget,
  cards,
  isDragging,
  onPointerDown,
}) => {
  const step = widget.width * FAN_STEP;
  const hidden = (widget.cardIds?.length ?? cards.length) - cards.length;
  return (
    <Box
      data-stack-fan
      onPointerDown={onPointerDown}
      style={{ left: widget.x, top: widget.y }}
      sx={{
        position: 'absolute',
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex,
        cursor: widget.movable !== false ? 'grab' : 'default',
        userSelect: 'none',
        transform: isDragging ? 'scale(1.05)' : undefined,
      }}
    >
      {cards.map((card, i) => (
        <Box
          key={card.id}
          sx={{
            position: 'absolute',
            left: i * step,
            top: 0,
            width: widget.width,
            height: widget.height,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'common.white',
            border: '1.5px solid rgba(0,0,0,0.2)',
            boxShadow: '-2px 0 6px rgba(0,0,0,0.35)',
          }}
        >
          <CardFaceContent card={card} isFaceUp={card.faceUp} />
        </Box>
      ))}
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          left: -10,
          minWidth: 24,
          height: 24,
          px: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          color: 'common.white',
          border: (theme) => `1.5px solid ${alpha(theme.palette.common.white, 0.6)}`,
          fontSize: '0.8rem',
          fontWeight: 800,
          pointerEvents: 'none',
        }}
      >
        {hidden > 0 ? `+${hidden}` : cards.length}
      </Box>
    </Box>
  );
};
