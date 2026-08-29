import React, { useEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useTranslation } from 'react-i18next';

interface RoundSuccessModalProps {
  open: boolean;
  word: string;
  roundNumber: number;
  guessesCount: number;
  onNextRound: () => void;
}

export const RoundSuccessModal: React.FC<RoundSuccessModalProps> = ({
  open,
  word,
  roundNumber,
  guessesCount,
  onNextRound,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      style={{
        margin: 'auto',
        border: 'none',
        borderRadius: '16px',
        padding: 0,
        backgroundColor: 'transparent',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        maxWidth: '420px',
        width: '90%',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          p: 3.5,
          borderRadius: 4,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CheckCircleRoundedIcon color="success" sx={{ fontSize: 64 }} />
        <Typography variant="h5" fontWeight={800}>
          {t('guessart.correctCelebration', 'Richtig erraten!')}
        </Typography>

        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, width: '100%' }}>
          <Typography variant="body2" color="text.secondary">
            {t('guessart.searchedWord', 'Gesuchtes Wort:')}
          </Typography>
          <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
            {word}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {t('guessart.roundStats', {
            round: roundNumber,
            guesses: guessesCount,
            defaultValue: `Runde ${roundNumber} mit ${guessesCount} Versuchen gelöst!`,
          })}
        </Typography>

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
    </dialog>
  );
};
