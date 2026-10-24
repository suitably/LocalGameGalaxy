import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ShieldIcon from '@mui/icons-material/ShieldRounded';
import AddCircleIcon from '@mui/icons-material/AddCircleRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import type { SheetCell } from '../logic/types';

const CORNER = {
  position: 'absolute',
  top: { xs: -7, sm: -9, md: -10 },
  right: { xs: -4, sm: -6, md: -7 },
  zIndex: 3,
  pointerEvents: 'none',
} as const;

const BUBBLE_SIZE = { xs: 18, sm: 22, md: 24 };
const BUBBLE_ICON = { xs: '0.75rem', sm: '0.95rem', md: '1.05rem' };

/** Floating corner badge of a cell: "2×" stamp or a bonus-effect bubble. */
export const QwixxCellBadge: React.FC<{ cell: SheetCell }> = ({ cell }) => {
  const { palette } = useTheme();
  const bubble = (bg: string) => ({
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: '50%',
    bgcolor: bg,
    border: `1.5px solid ${palette.piece.contrastText}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const stamp = cell.isDouble ? (
    <Box
      sx={{
        ...CORNER,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        fontWeight: 900,
        fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.8rem' },
        px: { xs: 0.45, sm: 0.65 },
        py: 0.15,
        borderRadius: 2,
        border: `1.5px solid ${palette.piece.contrastText}`,
        lineHeight: 1,
        letterSpacing: 0.5,
      }}
    >
      2×
    </Box>
  ) : null;

  const effect = cell.bonusEffect;

  return (
    <>
      {stamp}
      {effect && (
        <Box sx={CORNER}>
          {effect.type === 'shield' && (
            <Box sx={bubble(palette.primary.main)}>
              <ShieldIcon sx={{ fontSize: BUBBLE_ICON, color: 'primary.contrastText' }} />
            </Box>
          )}
          {effect.type === 'self_cross' && (
            <Box sx={bubble(palette.success.main)}>
              <AddCircleIcon sx={{ fontSize: BUBBLE_ICON, color: 'success.contrastText' }} />
            </Box>
          )}
          {effect.type === 'partner_cross' && (
            <Box sx={bubble(palette.piece[effect.targetColor] ?? palette.piece.red)}>
              <ArrowForwardIcon sx={{ fontSize: BUBBLE_ICON, color: 'piece.contrastText' }} />
            </Box>
          )}
        </Box>
      )}
    </>
  );
};
