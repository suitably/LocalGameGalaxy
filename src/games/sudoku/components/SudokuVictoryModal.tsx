/**
 * SudokuVictoryModal.tsx - Game Over & Victory Dialog
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Alert,
} from '@mui/material';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useTranslation } from 'react-i18next';
import type { SudokuDifficulty } from '../logic/types';

interface SudokuVictoryModalProps {
  open: boolean;
  onClose: () => void;
  isWon: boolean;
  difficulty: SudokuDifficulty;
  timeElapsed: number;
  bestTime: number | null;
  mistakes: number;
  hintsUsed: number;
  onNewGame: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SudokuVictoryModal: React.FC<SudokuVictoryModalProps> = ({
  open,
  onClose,
  isWon,
  difficulty,
  timeElapsed,
  bestTime,
  mistakes,
  hintsUsed,
  onNewGame,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const isNewBest = isWon && bestTime !== null && timeElapsed <= bestTime;

  const handleShare = async () => {
    const text = `🔢 Sudoku (${t(`sudoku.difficulty.${difficulty}`)}) gelöst in ${formatTime(timeElapsed)}!\nFehler: ${mistakes}, Hinweise: ${hintsUsed}\n\nhttps://localgamegalaxy.app/#/games/sudoku`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sudoku Result', text });
        return;
      } catch {
        // Fallback
      }
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 800, pb: 1 }}>
        {isWon ? t('sudoku.victory.title', 'Gelöst! 🎉') : t('sudoku.game_over.title', 'Game Over 😔')}
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: isWon ? '#4ade80' : '#ef4444', mb: 1 }}>
            {formatTime(timeElapsed)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(`sudoku.difficulty.${difficulty}`)}
          </Typography>

          {isNewBest && (
            <Alert severity="success" sx={{ mt: 2, py: 0.5 }}>
              🏆 {t('sudoku.victory.new_record', 'Neue persönliche Bestzeit!')}
            </Alert>
          )}
        </Box>

        <Stack spacing={1} sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">{t('sudoku.mistakes', 'Fehler')}:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{mistakes}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">{t('sudoku.hints', 'Hinweise')}:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{hintsUsed}</Typography>
          </Box>
          {bestTime !== null && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{t('sudoku.best_time', 'Bestzeit')}:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#60a5fa' }}>{formatTime(bestTime)}</Typography>
            </Box>
          )}
        </Stack>

        {copied && (
          <Alert severity="success" sx={{ mt: 2, py: 0.5 }}>
            {t('common.copied_to_clipboard', 'In die Zwischenablage kopiert!')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ReplayRoundedIcon />}
          onClick={() => {
            onClose();
            onNewGame();
          }}
        >
          {t('sudoku.new_game', 'Neues Spiel')}
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {isWon && (
            <Button
              variant="outlined"
              startIcon={copied ? <CheckRoundedIcon /> : <ShareRoundedIcon />}
              onClick={handleShare}
            >
              {copied ? t('common.copied', 'Kopiert!') : t('common.share', 'Teilen')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.close', 'Schließen')}</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
