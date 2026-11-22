import React, { useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useTranslation } from 'react-i18next';
import { useSchwimmenState } from '../hooks/useSchwimmenState';
import { CardGameHeader } from './common/CardGameHeader';
import { SchwimmenBlitzDialog, SchwimmenHistoryDialog } from './SchwimmenDialogs';
import { SchwimmenPlayerCard } from './SchwimmenPlayerCard';

interface SchwimmenGameViewProps {
  initialPlayers: string[];
  defaultLives?: number;
  onExit: () => void;
}

export const SchwimmenGameView: React.FC<SchwimmenGameViewProps> = ({
  initialPlayers,
  defaultLives = 3,
  onExit,
}) => {
  const { t } = useTranslation();
  const { piece } = useTheme().palette;
  const game = useSchwimmenState(initialPlayers, defaultLives);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { winner, roundHistory, selectedLoserIds } = game;
  const roundOpen = !winner && game.activePlayers.length > 1;

  return (
    <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', py: { xs: 1, sm: 2 } }}>
      <CardGameHeader
        roundLabel={`${t('games.cards.round')} ${game.roundNumber}`}
        onExit={onExit}
        onRestart={game.restart}
        onUndo={roundHistory.length > 0 ? game.undo : undefined}
        onHistory={roundHistory.length > 0 ? () => setHistoryOpen(true) : undefined}
      />

      {roundOpen && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t('games.cards.schwimmen.hint')}
          </Typography>
        </Paper>
      )}

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {game.players.map((player) => (
          <SchwimmenPlayerCard
            key={player.id}
            player={player}
            isMarkedLoser={selectedLoserIds.includes(player.id)}
            actionsEnabled={!winner}
            onToggleLoser={() => game.toggleLoser(player.id)}
            onBlitz={() => game.setBlitzConfirmPlayer(player)}
            onAdjustLife={(delta) => game.adjustLife(player.id, delta)}
          />
        ))}
      </Stack>

      {roundOpen && (
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          disabled={selectedLoserIds.length === 0}
          onClick={game.evaluateRound}
          sx={{ py: 1.5, fontSize: '1.05rem' }}
        >
          {selectedLoserIds.length === 0
            ? t('games.cards.schwimmen.select_loser_btn')
            : `${t('games.cards.schwimmen.deduct_lives_btn')} (${selectedLoserIds.length} ${t('games.cards.schwimmen.lives_deducted')})`}
        </Button>
      )}

      {winner && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mt: 2,
            textAlign: 'center',
            bgcolor: 'background.paper',
            border: '2px solid',
            borderColor: piece.yellow,
            borderRadius: 5,
          }}
        >
          <EmojiEventsRoundedIcon sx={{ fontSize: 64, color: piece.yellow, mb: 1 }} />
          <Typography variant="h5" component="p" sx={{ fontWeight: 800 }}>
            {winner.name} {t('games.cards.has_won')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            {t('games.cards.survived_all')}
          </Typography>
          <Button variant="contained" onClick={game.restart} startIcon={<ReplayRoundedIcon />}>
            {t('games.cards.play_again')}
          </Button>
        </Paper>
      )}

      <SchwimmenBlitzDialog
        player={game.blitzConfirmPlayer}
        onCancel={() => game.setBlitzConfirmPlayer(null)}
        onConfirm={game.executeBlitz}
      />
      <SchwimmenHistoryDialog
        open={historyOpen}
        entries={roundHistory}
        onClose={() => setHistoryOpen(false)}
      />
    </Box>
  );
};
