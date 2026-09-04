import React from 'react';
import { Paper, type SxProps, type Theme } from '@mui/material';

export interface DieColorConfig {
  bg: string;
  text: string;
  border?: string;
}

export const PRESET_DIE_COLORS: Record<string, DieColorConfig> = {
  white: { bg: '#ffffff', text: '#212121', border: '#e0e0e0' },
  red: { bg: '#d32f2f', text: '#ffffff', border: '#b71c1c' },
  yellow: { bg: '#fbc02d', text: '#212121', border: '#f57f17' },
  green: { bg: '#388e3c', text: '#ffffff', border: '#1b5e20' },
  blue: { bg: '#1976d2', text: '#ffffff', border: '#0d47a1' },
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
    typeof color === 'string'
      ? PRESET_DIE_COLORS[color] || PRESET_DIE_COLORS.white
      : color;

  const isClickable = Boolean(onClick && !disabled);

  return (
    <Paper
      elevation={isRolling ? 8 : isSelected ? 6 : 4}
      onClick={isClickable ? onClick : undefined}
      sx={{
        width: { xs: 44, sm: 52 },
        height: { xs: 44, sm: 52 },
        borderRadius: 2.5,
        bgcolor: resolvedColor.bg,
        color: resolvedColor.text,
        border: `2px solid ${resolvedColor.border || 'transparent'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: { xs: '1.25rem', sm: '1.6rem' },
        fontWeight: '900',
        boxShadow: isSelected ? '0 0 10px 2px rgba(255, 213, 79, 0.7)' : 3,
        transform: isRolling
          ? 'rotate(-6deg) scale(1.08)'
          : isSelected
          ? 'scale(1.1)'
          : 'none',
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
