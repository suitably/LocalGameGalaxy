import React, { useState } from 'react';
import { Dialog, DialogContent, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ClientSettings } from './ClientSettings';
import { markClientWelcomed, needsClientWelcome } from '../logic/clientWelcome';

/** First join of a phone: lets the player set name, colour and microphone once. */
export const PhoneWelcomeDialog: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(needsClientWelcome);

  const close = () => {
    markClientWelcomed();
    setOpen(false);
  };

  return (
    <Dialog open={open} fullScreen={fullScreen} fullWidth maxWidth="sm" onClose={close}>
      <DialogContent sx={{ p: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', px: 2, pt: 2 }}>
          {t('melodiq.welcome.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ px: 2, pt: 1 }}>
          {t('melodiq.welcome.body')}
        </Typography>
        <ClientSettings onBack={close} backLabel={t('melodiq.welcome.skip')} />
      </DialogContent>
    </Dialog>
  );
};
