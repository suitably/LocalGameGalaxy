/**
 * One opponent's row: name, score and four cards (face up only when visible to the viewer)
 * [ID: UI-CABO-OPPONENT]
 */
import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PlayingCard } from '../../../modules/playing-cards';
import type { CaboPlayer } from '../logic/types';

interface CaboOpponentProps {
  player: CaboPlayer;
  isCaller: boolean;
  /** Set when the current player must pick one of this opponent's cards. */
  selectable: boolean;
  isVisible: (slot: number) => boolean;
  onPickCard: (slot: number) => void;
}

export const CaboOpponent: React.FC<CaboOpponentProps> = ({
  player,
  isCaller,
  selectable,
  isVisible,
  onPickCard,
}) => {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography fontWeight={700} noWrap>
          {player.name}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {isCaller && (
            <Chip size="small" color="warning" label={t('games.cabo.table.cabo_chip')} />
          )}
          <Typography variant="body2" color="text.secondary">
            {t('games.cabo.table.total', { score: player.totalScore })}
          </Typography>
        </Stack>
      </Stack>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        {player.hand.map((card, slot) => {
          const visible = isVisible(slot);
          return (
            <PlayingCard
              key={card.id}
              card={card}
              faceUp={visible}
              highlighted={selectable}
              label={
                visible ? undefined : t('games.cabo.card.slot', { n: slot + 1, name: player.name })
              }
              onClick={selectable ? () => onPickCard(slot) : undefined}
            />
          );
        })}
      </Box>
    </Paper>
  );
};
