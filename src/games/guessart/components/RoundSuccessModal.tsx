import React from 'react';
import { Box, Button, Chip, Dialog, DialogContent, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useTranslation } from 'react-i18next';
import { RoundSuccessSynonyms } from './RoundSuccessSynonyms';

interface RoundSuccessModalProps {
  open: boolean;
  word: string;
  roundNumber: number;
  guessesCount: number;
  guesses?: string[];
  drawerName?: string;
  guesserName?: string;
  language?: string;
  originalWord?: string;
  originalLanguage?: string;
  onNextRound: () => void;
}

export const RoundSuccessModal: React.FC<RoundSuccessModalProps> = ({
  open,
  word,
  roundNumber,
  guessesCount,
  guesses = [],
  drawerName,
  guesserName,
  language = 'de',
  originalWord,
  originalLanguage: _originalLanguage,
  onNextRound,
}) => {
  const { t } = useTranslation();

  const incorrectGuesses = guesses.filter(
    (g) => g.trim().toLowerCase() !== word.trim().toLowerCase(),
  );

  return (
    <Dialog
      open={open}
      onClose={onNextRound}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundImage: 'none',
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Box
          sx={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          <CheckCircleRoundedIcon color="success" sx={{ fontSize: { xs: 48, sm: 60 } }} />
          <Typography variant="h5" fontWeight={800}>
            {t('guessart.correctCelebration', 'Richtig erraten!')}
          </Typography>

          {drawerName && guesserName && (
            <Chip
              label={`${drawerName} vs. ${guesserName}`}
              size="small"
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 700 }}
            />
          )}

          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, width: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              {t('guessart.searchedWord', 'Gesuchtes Wort:')}
            </Typography>
            <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
              {word}
            </Typography>
            {originalWord && originalWord.trim().toLowerCase() !== word.trim().toLowerCase() && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}
              >
                {t('guessart.drawnAsOriginal', {
                  word: originalWord,
                  defaultValue: `(Gezeichnet als: ${originalWord})`,
                })}
              </Typography>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">
            {t('guessart.roundStats', {
              round: roundNumber,
              guesses: guessesCount,
              defaultValue: `Runde ${roundNumber} mit ${guessesCount} Versuchen gelöst!`,
            })}
          </Typography>

          {incorrectGuesses.length > 0 && (
            <RoundSuccessSynonyms
              key={`${open}-${language}-${word}`}
              word={word}
              language={language}
              incorrectGuesses={incorrectGuesses}
            />
          )}

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={onNextRound}
            sx={{ mt: 1, py: 1.5, fontWeight: 700 }}
          >
            {t('guessart.nextRound', 'Nächste Runde')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
