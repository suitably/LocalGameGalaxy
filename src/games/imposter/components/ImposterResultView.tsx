import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import { useTranslation } from 'react-i18next';
import type { GameState } from '../logic/types';

interface ImposterResultViewProps {
  players: GameState['players'];
  winner: GameState['winner'];
  onPlayAgain: () => void;
}

export const ImposterResultView: React.FC<ImposterResultViewProps> = ({
  players,
  winner,
  onPlayAgain,
}) => {
  const { t } = useTranslation();
  const kickedOne = players.find((p) => p.isKicked);
  const roleText = kickedOne?.isImposter
    ? t('games.imposter.result.imposter')
    : t('games.imposter.result.normal');
  const innocentsWon = winner === 'NORMAL';

  return (
    <Box sx={{ textAlign: 'center', py: 5 }}>
      <Paper
        sx={{
          p: 5,
          mb: 4,
          borderRadius: 2,
          bgcolor: innocentsWon ? 'piece.green' : 'piece.red',
          border: '1px solid',
          borderColor: 'divider',
          color: 'piece.contrastText',
        }}
      >
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          {innocentsWon
            ? t('games.imposter.result.innocents_win')
            : t('games.imposter.result.imposters_win')}
        </Typography>
        <Typography variant="h6">
          {t('games.imposter.result.revealed_role', { name: kickedOne?.name, role: roleText })}
        </Typography>
      </Paper>

      {/* The hub exit is the GlobalHeader's home button; play again is the one action here. */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="contained" size="large" startIcon={<ReplayIcon />} onClick={onPlayAgain}>
          {t('games.werewolf.play_again')}
        </Button>
      </Box>
    </Box>
  );
};
