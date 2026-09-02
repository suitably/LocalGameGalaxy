/**
 * WordleStatsModal.tsx - Statistics, Win/Loss Summary and Emoji Sharing
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
  LinearProgress,
  Stack,
  Alert,
} from '@mui/material';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useTranslation } from 'react-i18next';
import { wordleEngine } from '../logic/wordleEngine';
import type { EvaluatedLetter, WordleGameMode, WordleStats } from '../logic/types';

interface WordleStatsModalProps {
  open: boolean;
  onClose: () => void;
  stats: WordleStats;
  gameStatus: 'playing' | 'won' | 'lost';
  targetWord: string;
  evaluations: EvaluatedLetter[][];
  mode: WordleGameMode;
  dateKey: string;
  onPlayAgain?: () => void;
}

export const WordleStatsModal: React.FC<WordleStatsModalProps> = ({
  open,
  onClose,
  stats,
  gameStatus,
  targetWord,
  evaluations,
  mode,
  dateKey,
  onPlayAgain,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxGuessCount = Math.max(1, ...Object.values(stats.guessDistribution));

  const handleShare = async () => {
    const text = wordleEngine.generateShareGrid(evaluations, gameStatus === 'won', mode, dateKey);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Wordle Result',
          text,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 800, pb: 1 }}>
        {gameStatus === 'won'
          ? t('wordle.modal.title_won', 'Gewonnen! 🎉')
          : gameStatus === 'lost'
          ? t('wordle.modal.title_lost', 'Schade! 😔')
          : t('wordle.modal.title_stats', 'Statistiken 📊')}
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        {gameStatus !== 'playing' && (
          <Box sx={{ textAlign: 'center', my: 1.5, p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('wordle.modal.target_was', 'Das gesuchte Wort war:')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#90caf9', letterSpacing: 2, mt: 0.5 }}>
              {targetWord}
            </Typography>
          </Box>
        )}

        {/* Top Numbers Grid */}
        <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ my: 2 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.played}</Typography>
            <Typography variant="caption" color="text.secondary">{t('wordle.stats.played', 'Gespielt')}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{winRate}%</Typography>
            <Typography variant="caption" color="text.secondary">{t('wordle.stats.win_rate', 'Gewonnen')}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.currentStreak}</Typography>
            <Typography variant="caption" color="text.secondary">{t('wordle.stats.current_streak', 'Serie')}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.maxStreak}</Typography>
            <Typography variant="caption" color="text.secondary">{t('wordle.stats.max_streak', 'Rekord')}</Typography>
          </Box>
        </Stack>

        {/* Guess Distribution Bars */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1.5 }}>
          {t('wordle.stats.distribution', 'Verteilung der Versuche')}
        </Typography>

        <Stack spacing={1}>
          {([1, 2, 3, 4, 5, 6] as const).map((num) => {
            const count = stats.guessDistribution[num] || 0;
            const percentage = (count / maxGuessCount) * 100;
            const isCurrentWinningRow = gameStatus === 'won' && evaluations.length === num;

            return (
              <Box key={num} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, width: 12 }}>
                  {num}
                </Typography>
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(8, percentage)}
                    sx={{
                      height: 22,
                      borderRadius: 1,
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: isCurrentWinningRow ? '#2e7d32' : '#374151',
                        borderRadius: 1,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      right: 8,
                      top: 2,
                      fontWeight: 800,
                      color: '#ffffff',
                    }}
                  >
                    {count}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>

        {copied && (
          <Alert severity="success" sx={{ mt: 2, py: 0.5 }}>
            {t('wordle.copied_to_clipboard', 'In die Zwischenablage kopiert! 📋')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'space-between' }}>
        {onPlayAgain && mode !== 'daily' && (
          <Button
            variant="outlined"
            startIcon={<ReplayRoundedIcon />}
            onClick={() => {
              onClose();
              onPlayAgain();
            }}
          >
            {t('wordle.play_again', 'Nochmal spielen')}
          </Button>
        )}

        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          {gameStatus !== 'playing' && (
            <Button
              variant="contained"
              color="success"
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
