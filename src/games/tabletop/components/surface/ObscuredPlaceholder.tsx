/**
 * Inert stand-in for a widget inside a hidden zone the viewer may not see [ID: COMP-TABLETOP-OBSCURED]
 *
 * Used on the board, in drag overlays and for flying cards, so no view reveals a hidden widget (#551).
 */
import React from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';

export const ObscuredPlaceholder: React.FC<{ sx?: SxProps<Theme> }> = ({ sx = {} }) => (
  <Box
    aria-hidden
    sx={[
      {
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        opacity: 0.95,
        userSelect: 'none',
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  />
);
