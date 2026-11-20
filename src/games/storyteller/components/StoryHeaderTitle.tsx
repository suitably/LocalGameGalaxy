import React from 'react';
import { alpha, Box, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StoryGameRecord } from '../types';

interface StoryHeaderTitleProps {
  game: StoryGameRecord;
  isCurrentTurnLocal: boolean;
}

/** Global-header title of a running story: name, turn number and who writes now. */
export const StoryHeaderTitle: React.FC<StoryHeaderTitleProps> = ({ game, isCurrentTurnLocal }) => {
  const { t } = useTranslation();
  const activePlayer = game.players[game.currentPlayerIndex] || {
    name: t('storyteller.defaultPlayer', 'Spieler'),
  };

  return (
    <Box sx={{ minWidth: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ lineHeight: 1.3 }}>
          {game.name || t('games.storyteller.title', 'Geschichtenschreiber')}
        </Typography>
        <Chip
          size="small"
          label={`${t('storyteller.turnLabel', 'Zug')} ${game.turnNumber}`}
          sx={{
            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.15),
            color: 'secondary.main',
            fontWeight: 600,
            height: 22,
            flexShrink: 0,
          }}
        />
      </Box>

      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
        {t('storyteller.currentTurnOf', 'Am Zug: ')}
        <Box component="strong" sx={{ color: 'secondary.main' }}>
          {activePlayer.name}
        </Box>
        {!isCurrentTurnLocal && ` (${t('storyteller.remotePlayer', 'Remote')})`}
      </Typography>
    </Box>
  );
};
