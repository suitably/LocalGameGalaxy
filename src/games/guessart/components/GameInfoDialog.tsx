import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
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
          borderRadius: 5,
          backgroundImage: 'none',
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Typography variant="h5" fontWeight={800} color="primary.text" gutterBottom>
          {t('guessart.rulesTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('guessart.rulesIntro')}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <BrushRoundedIcon color="primary" sx={{ mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t('guessart.step1Title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('guessart.step1Desc')}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="flex-start">
            <PsychologyRoundedIcon color="secondary" sx={{ mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t('guessart.step2Title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('guessart.step2Desc')}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} alignItems="flex-start">
            <LightbulbRoundedIcon sx={{ color: 'warning.main', mt: 0.3 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {t('guessart.step3Title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('guessart.step3Desc')}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 2 }}>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
