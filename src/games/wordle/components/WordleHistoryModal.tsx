import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useWordleHistory } from '../hooks/useWordleHistory';
import type { EvaluatedLetter } from '../logic/types';

interface WordleHistoryModalProps {
  open: boolean;
  onClose: () => void;
  language: string;
}

const statusColors = {
  correct: { bg: '#2e7d32', border: '#2e7d32', text: '#ffffff' },
  present: { bg: '#f9a825', border: '#f9a825', text: '#ffffff' },
  absent: { bg: '#374151', border: '#374151', text: '#9ca3af' },
};

export const WordleHistoryModal: React.FC<WordleHistoryModalProps> = ({ open, onClose, language }) => {
  const { t } = useTranslation();
  const { history, refreshHistory } = useWordleHistory(language);

  // Refresh history every time modal opens
  useEffect(() => {
    if (open) {
      refreshHistory();
    }
  }, [open, refreshHistory]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {t('wordle.history.title', 'Historie (Tagesrätsel)')}
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
        {history.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: 'center', my: 4, color: 'text.secondary' }}>
            {t('wordle.history.empty', 'Noch keine Tagesrätsel gespielt.')}
          </Typography>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            {history.map((entry) => (
              <Box key={entry.dateKey} sx={{ bgcolor: 'rgba(255,255,255,0.03)', p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {entry.dateKey}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: entry.status === 'won' ? 'rgba(46, 125, 50, 0.2)' : entry.status === 'lost' ? 'rgba(211, 47, 47, 0.2)' : 'rgba(255,255,255,0.1)',
                      color: entry.status === 'won' ? '#81c784' : entry.status === 'lost' ? '#e57373' : '#e0e0e0',
                      fontWeight: 700
                    }}
                  >
                    {entry.status === 'won' ? t('wordle.status.won', 'Gewonnen') : entry.status === 'lost' ? t('wordle.status.lost', 'Verloren') : t('wordle.status.playing', 'Am Spielen')}
                  </Typography>
                </Box>

                {(entry.status === 'won' || entry.status === 'lost') && (
                  <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                    {t('wordle.history.target_word', 'Gesuchtes Wort:')} <Box component="span" sx={{ color: '#90caf9', fontWeight: 800, letterSpacing: 1 }}>{entry.targetWord}</Box>
                  </Typography>
                )}

                <Stack spacing={0.5}>
                  {entry.evaluations.map((row: EvaluatedLetter[], rowIndex) => (
                    <Box key={rowIndex} sx={{ display: 'flex', gap: 0.5 }}>
                      {row.map((letter, colIndex) => {
                        // For backwards compatibility or corrupted data
                        const status = letter.status === 'correct' || letter.status === 'present' || letter.status === 'absent'
                          ? letter.status
                          : 'absent';
                        const style = statusColors[status];

                        return (
                          <Box
                            key={colIndex}
                            sx={{
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.9rem',
                              fontWeight: 800,
                              borderRadius: 1,
                              bgcolor: style.bg,
                              color: style.text,
                            }}
                          >
                            {letter.char}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close', 'Schließen')}</Button>
      </DialogActions>
    </Dialog>
  );
};
