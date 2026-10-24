import React, { useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import { rankPlayersByScore } from '../../logic/cardPlayers';
import type { CardPlayer } from '../../logic/types';

interface CardGameScoreSummaryProps {
  players: CardPlayer[];
}

/** Horizontal leaderboard: one chip per player, ranked by score, leader highlighted. */
export const CardGameScoreSummary: React.FC<CardGameScoreSummaryProps> = ({ players }) => {
  const ranked = useMemo(() => rankPlayersByScore(players), [players]);

  return (
    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1.5, mb: 2 }}>
      {ranked.map((p, idx) => (
        <Chip
          key={p.id}
          label={`${idx + 1}. ${p.name}: ${p.score}P`}
          color={idx === 0 ? 'primary' : 'default'}
          variant={idx === 0 ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        />
      ))}
    </Box>
  );
};
