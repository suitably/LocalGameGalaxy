import React from 'react';
import { Box, Button, alpha } from '@mui/material';
import { transitionOf } from '../../../lib/motion';

interface ScoreQuickAmountsProps {
  amounts: number[];
  tone: 'success' | 'error';
  onPick: (amount: number) => void;
}

/** One horizontally scrollable row of quick +/- score buttons. */
export const ScoreQuickAmounts: React.FC<ScoreQuickAmountsProps> = ({ amounts, tone, onPick }) => (
  <Box sx={{ display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.2 }}>
    {amounts.map((amt) => (
      <Button
        key={amt}
        size="small"
        variant="outlined"
        onClick={() => onPick(amt)}
        sx={{
          minWidth: 44,
          py: 0.2,
          px: 1,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: `${tone}.main`,
          borderColor: (theme) => alpha(theme.palette[tone].main, 0.3),
          bgcolor: (theme) => alpha(theme.palette[tone].main, 0.04),
          borderRadius: 2,
          textTransform: 'none',
          transition: transitionOf(['background-color', 'border-color']),
          '&:hover': {
            borderColor: `${tone}.main`,
            bgcolor: (theme) => alpha(theme.palette[tone].main, 0.15),
          },
        }}
      >
        {amt > 0 ? `+${amt}` : amt}
      </Button>
    ))}
  </Box>
);
