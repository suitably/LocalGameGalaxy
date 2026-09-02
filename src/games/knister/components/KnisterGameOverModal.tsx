import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ReplayIcon from '@mui/icons-material/Replay';
import { useTranslation } from 'react-i18next';
import { calculateBoardScores } from '../logic/knisterScoring';
import type { KnisterPlayer } from '../logic/types';

interface KnisterGameOverModalProps {
  open: boolean;
  players: KnisterPlayer[];
  highScore: number;
  onNewGame: () => void;
  onClose: () => void;
}

export const KnisterGameOverModal: React.FC<KnisterGameOverModalProps> = ({
  open,
  players,
  highScore,
  onNewGame,
  onClose,
}) => {
  const { t } = useTranslation();

  const rankedPlayers = players
    .map((p) => ({
      player: p,
      scores: calculateBoardScores(p.grid),
    }))
    .sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  const winner = rankedPlayers[0];
  const isNewHighScore = winner && winner.scores.totalScore >= highScore && winner.scores.totalScore > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(22, 22, 35, 0.98)',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          textAlign: 'center',
          p: 2,
        },
      }}
    >
      <DialogTitle>
        <EmojiEventsIcon sx={{ fontSize: 56, color: '#ffb74d', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {t('games.knister.game_over_title', 'Spiel beendet!')}
        </Typography>
        {isNewHighScore && (
          <Typography variant="subtitle2" sx={{ color: '#81c784', fontWeight: 700, mt: 0.5 }}>
            🎉 {t('games.knister.new_high_score', 'Neuer Highscore!')} 🎉
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1 }}>
          {rankedPlayers.map(({ player, scores }, idx) => (
            <Box
              key={player.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                bgcolor: idx === 0 ? 'rgba(255, 183, 77, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                borderRadius: 2.5,
                border: idx === 0 ? '1px solid rgba(255, 183, 77, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {idx + 1}. {player.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Zeilen: {scores.rows.reduce((a, b) => a + b.points, 0)}P | Spalten:{' '}
                  {scores.cols.reduce((a, b) => a + b.points, 0)}P | Diagonale:{' '}
                  {scores.mainDiag.points * 2 + scores.antiDiag.points * 2}P
                </Typography>
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 900, color: idx === 0 ? 'warning.light' : 'text.primary' }}>
                {scores.totalScore}P
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary">
          {t('games.knister.high_score_label', 'Aktueller Highscore')}: <strong>{highScore} Punkte</strong>
        </Typography>
      </DialogContent>

      <DialogActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
        <Button
          variant="contained"
          color="warning"
          size="large"
          fullWidth
          startIcon={<ReplayIcon />}
          onClick={onNewGame}
          sx={{ borderRadius: 50, fontWeight: 700 }}
        >
          {t('games.knister.play_again', 'Nochmal spielen')}
        </Button>
        <Button onClick={onClose} variant="text" fullWidth sx={{ color: 'text.secondary' }}>
          {t('common.close', 'Schließen')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
