import React, { useEffect, useRef } from 'react';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import { useTranslation } from 'react-i18next';

interface GameInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export const GameInfoDialog: React.FC<GameInfoDialogProps> = ({ open, onClose }) => {
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
        maxWidth: '500px',
        width: '90%',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          p: 3.5,
          borderRadius: 4,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <Typography variant="h5" fontWeight={800} color="primary.main" gutterBottom>
          {t('guessart.rulesTitle', 'Spielregeln: GuessArt')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t(
            'guessart.rulesIntro',
            'GuessArt ist ein lokales Zeichen- und Ratespiel für 2 oder mehr Spieler.',
          )}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <BrushRoundedIcon color="primary" sx={{ mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t('guessart.step1Title', '1. Wort wählen & zeichnen')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'guessart.step1Desc',
                  'Der aktuelle Zeichner wählt ein Wort aus einer Kategorie (oder gibt ein eigenes Wort ein) und zeichnet es auf der Leinwand.',
                )}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="flex-start">
            <PsychologyRoundedIcon color="secondary" sx={{ mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t('guessart.step2Title', '2. Raten & Replay')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'guessart.step2Desc',
                  'Das Gerät wird an die anderen Spieler übergeben. Die Zeichnung wird animiert abgespielt und die Mitspieler tippen ihre Vermutungen ein.',
                )}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="flex-start">
            <LightbulbRoundedIcon color="warning" sx={{ mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t('guessart.step3Title', '3. Tipps nutzen')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'guessart.step3Desc',
                  'Wenn man nicht weiterweiß, schaltet der Tipp-Button zuerst die Wortlänge frei und beim zweiten Klick einen Buchstaben-Pool.',
                )}
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={onClose}
          sx={{ mt: 3, py: 1.2, fontWeight: 700 }}
        >
          {t('common.close', 'Verstanden')}
        </Button>
      </Box>
    </dialog>
  );
};
