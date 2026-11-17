/**
 * One opponent's row: name, score and four face-down cards [ID: UI-CABO-OPPONENT]
 */
import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { CaboPlayer } from '../logic/types';
import { CaboCard } from './CaboCard';

interface CaboOpponentProps {
  player: CaboPlayer;
  isActive: boolean;
  isCaller: boolean;
  /** Set when the current player must pick one of this opponent's cards. */
  selectable: boolean;
  onPickCard?: (slot: number) => void;
}

export const CaboOpponent: React.FC<CaboOpponentProps> = ({
  player,
  isActive,
  isCaller,
  selectable,
  onPickCard,
}) => {
  const { t } = useTranslation();
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderColor: isActive ? 'primary.main' : 'divider',
        borderWidth: isActive ? 2 : 1,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography fontWeight={700} noWrap>
          {player.name}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {isCaller && <Chip size="small" color="warning" label="Cabo" />}
          <Typography variant="body2" color="text.secondary">
            {t('games.cabo.table.total', { score: player.totalScore })}
          </Typography>
        </Stack>
      </Stack>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        {player.hand.map((card, slot) => (
          <CaboCard
            key={card.id}
            card={card}
            faceUp={false}
            highlighted={selectable}
            onClick={selectable && onPickCard ? () => onPickCard(slot) : undefined}
          />
        ))}
      </Box>
    </Paper>
  );
};
