/**
 * Smooth table motion: widgets glide to new positions, cards flip [ID: COMP-TABLETOP-MOTION]
 *
 * Applies to every board widget (moves from other devices, holder re-layouts, undo), so the
 * widget views need no per-type animation code. Respects reduced-motion settings.
 */
import React from 'react';
import { GlobalStyles } from '@mui/material';

export const TableMotionStyles: React.FC = () => (
  <GlobalStyles
    styles={{
      '@keyframes tabletop-card-flip': {
        '0%': { transform: 'scaleX(1)' },
        '50%': { transform: 'scaleX(0)' },
        '100%': { transform: 'scaleX(1)' },
      },
      '@media (prefers-reduced-motion: no-preference)': {
        '#tabletop-board-canvas [data-widget-wrapper] > *': {
          transitionProperty: 'left, top, width, height, transform, box-shadow, filter',
          transitionDuration: '0.25s',
          transitionTimingFunction: 'ease-out',
        },
        '#tabletop-board-canvas [data-card-flip]': {
          animation: 'tabletop-card-flip 0.3s ease-in-out',
        },
      },
    }}
  />
);
