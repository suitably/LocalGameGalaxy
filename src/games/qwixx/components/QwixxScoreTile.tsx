import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface QwixxScoreTileProps {
  label: string;
  value: number;
  /** Tile colour (piece / status colour). Tinted at 16 % behind `text.primary`, outlined solid. */
  color: string;
  icon?: React.ReactNode;
  minWidth?: number;
}

/** One term of the score formula (row score, bonus or penalty). Phones: value only, colour-coded. */
export const QwixxScoreTile: React.FC<QwixxScoreTileProps> = ({
  label,
  value,
  color,
  icon,
  minWidth = 48,
}) => (
  <Box
    title={label}
    aria-label={`${label}: ${value}`}
    sx={{
      p: { xs: 0.5, sm: 1 },
      borderRadius: 2,
      bgcolor: alpha(color, 0.16),
      border: `1px solid ${color}`,
      textAlign: 'center',
      minWidth: { xs: 34, sm: minWidth },
    }}
  >
    <Box
      sx={{
        display: { xs: 'none', sm: 'flex' },
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
        {label}
      </Typography>
    </Box>
    <Typography
      variant="h6"
      sx={{
        color: 'text.primary',
        fontWeight: 'bold',
        fontVariantNumeric: 'tabular-nums',
        fontSize: { xs: '1rem', sm: undefined },
        lineHeight: 1.3,
      }}
    >
      {value}
    </Typography>
  </Box>
);
