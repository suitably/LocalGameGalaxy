import React from 'react';
import { Box, Button, Dialog, DialogContent, Divider, Stack, Typography } from '@mui/material';
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundImage: 'none',
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
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
                {t('guessart.step1Title', '1. Zeichnen')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'guessart.step1Desc',
                  'Ein Spieler wählt ein Wort aus und zeichnet es auf der Leinwand. Es gibt kein Zeitlimit.',
                )}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="flex-start">
            <PsychologyRoundedIcon color="secondary" sx={{ mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t('guessart.step2Title', '2. Raten')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'guessart.step2Desc',
                  'Die anderen Spieler versuchen, das Wort zu erraten. Die Zeichnung wird als animierter Zeitraffer abgespielt!',
                )}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="flex-start">
            <LightbulbRoundedIcon sx={{ color: 'warning.main', mt: 0.3 }} />
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
      </DialogContent>
    </Dialog>
  );
};
