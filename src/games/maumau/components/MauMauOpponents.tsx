/**
 * Card counts, "Mau!" chip and round wins of the players who are not up [ID: UI-MAUMAU-OPPONENTS]
 *
 * Only counts are shown, never faces.
 */
import React from 'react';
import { Chip, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MauMauState } from '../logic/types';

interface MauMauOpponentsProps {
  game: MauMauState;
}

export const MauMauOpponents: React.FC<MauMauOpponentsProps> = ({ game }) => {
  const { t } = useTranslation();
  return (
    <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
      {game.players.map((p, i) =>
        i === game.currentIndex ? null : (
          <Paper key={p.id} variant="outlined" sx={{ px: 1.5, py: 1 }}>
            <Typography fontWeight={700}>{p.name}</Typography>
            <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
              <Chip size="small" label={t('games.maumau.table.cards', { count: p.hand.length })} />
              {p.hand.length === 1 && (
                <Chip size="small" color="warning" label={t('games.maumau.table.mau')} />
              )}
              <Typography variant="caption" color="text.secondary">
                {t('games.maumau.table.wins', { count: p.wins })}
              </Typography>
            </Stack>
          </Paper>
        ),
      )}
    </Stack>
  );
};
