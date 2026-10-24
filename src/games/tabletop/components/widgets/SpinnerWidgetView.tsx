/**
 * Wheel of options; tap to spin [ID: COMP-TABLETOP-SPINNER-VIEW]
 */
import React from 'react';
import { alpha, Box } from '@mui/material';
import type { SpinnerWidget } from '../../logic/types';
import { PIECE_ORDER, piecePalette } from '../../../../themeTokens';

interface SpinnerWidgetViewProps {
  widget: SpinnerWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onSpin: () => void;
}

const SLICE_COLORS = PIECE_ORDER.map((c) => piecePalette[c]);

export const SpinnerWidgetView: React.FC<SpinnerWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
  onSpin,
}) => {
  const n = Math.max(1, widget.options.length);
  const slice = 360 / n;
  const gradient = Array.from(
    { length: n },
    (_, i) => `${SLICE_COLORS[i % SLICE_COLORS.length]} ${i * slice}deg ${(i + 1) * slice}deg`,
  ).join(', ');
  const size = Math.min(widget.width, widget.height);

  return (
    <Box
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        onSpin();
      }}
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: size,
        height: size,
        zIndex: widget.zIndex + (isDragging ? 100 : 0),
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
          border: (theme) => `3px solid ${alpha(theme.palette.text.primary, 0.8)}`,
          boxShadow: 4,
          transform: `rotate(${widget.angle}deg)`,
          transition: 'transform 2.5s cubic-bezier(0.17, 0.67, 0.21, 1)',
          position: 'relative',
        }}
      >
        {widget.options.map((opt, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              left: '50%',
              top: 0,
              height: '50%',
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${i * slice + slice / 2}deg)`,
              pt: 1,
              fontSize: Math.max(10, size / 14),
              fontWeight: 700,
              color: 'text.primary',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
            }}
          >
            {opt}
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '18px solid white',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
        }}
      />
    </Box>
  );
};
