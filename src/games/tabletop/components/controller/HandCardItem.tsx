import React, { useState, useRef } from 'react';
import { Box } from '@mui/material';
import type { CardWidget } from '../../logic/types';
import { PlayingCardFace } from '../widgets/PlayingCardFace';

interface HandCardItemProps {
  card: CardWidget;
  isSelected?: boolean;
  onSelect: (cardId: string) => void;
  onFlick: (cardId: string) => void;
}

export const HandCardItem: React.FC<HandCardItemProps> = ({
  card,
  isSelected,
  onSelect,
  onFlick,
}) => {
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === null) return;
    const deltaY = e.clientY - startYRef.current;
    if (deltaY < 0) {
      setDragOffsetY(deltaY);
    }
  };

  const handlePointerUp = () => {
    if (startYRef.current !== null) {
      const elapsed = Date.now() - startTimeRef.current;
      const isFlick = dragOffsetY < -100 || (dragOffsetY < -50 && elapsed < 250);

      if (isFlick) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(25);
        }
        onFlick(card.id);
      } else if (Math.abs(dragOffsetY) < 10) {
        onSelect(card.id);
      }
    }

    startYRef.current = null;
    setDragOffsetY(0);
    setIsDragging(false);
  };

  const content = card.frontContent;

  return (
    <Box
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      sx={{
        width: 80,
        height: 125,
        flexShrink: 0,
        borderRadius: 2.5,
        bgcolor: '#fff',
        color: content.color || '#111',
        boxShadow: isSelected ? 8 : (isDragging ? 6 : 3),
        border: '2px solid',
        borderColor: isSelected ? 'primary.main' : 'rgba(0,0,0,0.12)',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: `translateY(${dragOffsetY}px) ${isSelected ? 'translateY(-16px) scale(1.05)' : ''}`,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <PlayingCardFace
        frontContent={card.frontContent}
        backContent={card.backContent}
        isFaceUp={true}
        label={card.label}
        width={80}
        height={125}
      />

      {/* Swipe up indicator hint */}
      {isDragging && dragOffsetY < -30 && (
        <Box
          sx={{
            position: 'absolute',
            top: -24,
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'primary.main',
            bgcolor: 'background.paper',
            px: 1,
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          ▲ Zum TV wischen
        </Box>
      )}
    </Box>
  );
};
