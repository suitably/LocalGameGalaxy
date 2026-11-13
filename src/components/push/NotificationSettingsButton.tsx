/**
 * Small entry point to the notification channel chooser [ID: PUSH-SETTINGS-BUTTON]
 *
 * For screens where notifications are a side topic (e.g. the share dialog): one quiet button
 * that opens the chooser in its own dialog instead of showing it inline.
 */
import React, { useState } from 'react';
import { Button, Dialog, DialogContent } from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import { useTranslation } from 'react-i18next';
import { PushNotificationBanner } from './PushNotificationBanner';

export const NotificationSettingsButton: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button
        size="small"
        variant="text"
        color="inherit"
        startIcon={<NotificationsRoundedIcon fontSize="small" />}
        onClick={() => setOpen(true)}
        sx={{ textTransform: 'none', minHeight: 36, color: 'text.secondary' }}
      >
        {t('settings.notify_open', 'Benachrichtigungen einrichten')}
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
        <DialogContent>
          <PushNotificationBanner onDismiss={close} onChosen={close} />
        </DialogContent>
      </Dialog>
    </>
  );
};
