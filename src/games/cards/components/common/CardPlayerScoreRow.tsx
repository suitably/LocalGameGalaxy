import React from 'react';
import { Paper } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

export type CardPlayerRowTone = 'default' | 'loser' | 'swimming' | 'eliminated';

interface CardPlayerScoreRowProps {
  tone?: CardPlayerRowTone;
  children: React.ReactNode;
}

const toneStyles = (theme: Theme, tone: CardPlayerRowTone) => {
  switch (tone) {
    case 'loser':
      return {
        bgcolor: alpha(theme.palette.piece.red, 0.16),
        borderColor: theme.palette.piece.red,
      };
    case 'swimming':
      return {
        bgcolor: alpha(theme.palette.piece.teal, 0.16),
        borderColor: theme.palette.piece.teal,
      };
    case 'eliminated':
      return { bgcolor: 'background.default', borderColor: 'transparent', opacity: 0.55 };
    default:
      return { bgcolor: 'background.paper', borderColor: 'divider' };
  }
};

/** Bordered player row (surface colour, no elevation) whose tint follows the player's state. */
export const CardPlayerScoreRow: React.FC<CardPlayerScoreRowProps> = ({
  tone = 'default',
  children,
}) => (
  <Paper
    elevation={0}
    sx={(theme) => ({
      p: { xs: 1.5, sm: 2 },
      borderRadius: 3,
      border: '2px solid',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 1.5,
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
      ...toneStyles(theme, tone),
    })}
  >
    {children}
  </Paper>
);
