import React from 'react';
import { Paper, type SxProps, type Theme } from '@mui/material';
import { pieceNeutrals, piecePalette } from '../../themeTokens';

export interface DieColorConfig {
  bg: string;
  text: string;
  border?: string;
}

export const PRESET_DIE_COLORS: Record<string, DieColorConfig> = {
  white: { bg: pieceNeutrals.white, text: piecePalette.contrastText },
  red: { bg: piecePalette.red, text: piecePalette.contrastText },
  yellow: { bg: piecePalette.yellow, text: piecePalette.contrastText },
  green: { bg: piecePalette.green, text: piecePalette.contrastText },
  blue: { bg: piecePalette.blue, text: piecePalette.contrastText },
};

export interface Die3DProps {
  value?: number | string;
  color?: DieColorConfig | keyof typeof PRESET_DIE_COLORS;
  isRolling?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

export const Die3D: React.FC<Die3DProps> = ({
  value,
  color = 'white',
  isRolling = false,
  isSelected = false,
  onClick,
  disabled = false,
  sx,
}) => {
  const resolvedColor: DieColorConfig =
    typeof color === 'string' ? PRESET_DIE_COLORS[color] || PRESET_DIE_COLORS.white : color;

  const isClickable = Boolean(onClick && !disabled);

  return (
    <Paper
      elevation={isRolling ? 8 : isSelected ? 6 : 4}
      onClick={isClickable ? onClick : undefined}
      sx={{
        width: { xs: 44, sm: 52 },
        height: { xs: 44, sm: 52 },
        borderRadius: 3,
        bgcolor: resolvedColor.bg,
        color: resolvedColor.text,
        border: `2px solid ${resolvedColor.border || 'transparent'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: { xs: '1.25rem', sm: '1.6rem' },
        fontWeight: 800,
        // tactile edge (DESIGN.md §5); selection uses the accent ring
        boxShadow: (theme) =>
          isSelected
            ? `0 0 0 3px ${theme.palette.secondary.main}, 0 4px 0 rgba(0, 0, 0, 0.35)`
            : '0 4px 0 rgba(0, 0, 0, 0.35)',
        transform: isRolling ? 'rotate(-6deg) scale(1.08)' : isSelected ? 'scale(1.1)' : 'none',
        transition: 'all 0.15s ease',
        cursor: isClickable ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        '&:active': isClickable ? { transform: 'scale(0.95)' } : {},
        ...sx,
      }}
    >
      {value !== undefined ? value : '?'}
    </Paper>
  );
};
