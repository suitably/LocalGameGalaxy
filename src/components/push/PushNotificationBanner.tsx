import React, { useCallback, useState } from 'react';
import { Alert, Button } from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useTranslation } from 'react-i18next';

type PushPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied';

function getPermissionState(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

/**
 * Inline banner prompting the user to enable push notifications.
 * Shows contextual status:
 * - "prompt": One-click enable button
 * - "granted": Green confirmation
 * - "denied": Info about re-enabling via browser settings
 * - "unsupported": Hidden
 */
export const PushNotificationBanner: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<PushPermissionState>(getPermissionState);

  const handleEnable = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setState(result as PushPermissionState);
    } catch {
      setState(getPermissionState());
    }
  }, []);

  const handleTestNotification = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(t('guessart.notificationTitle', 'GuessArt: Du bist dran!'), {
            body: t('guessart.pushTestBody', '🎉 Test erfolgreich! Push-Benachrichtigungen funktionieren einwandfrei.'),
            icon: '/pwa/icon_full.png',
          });
          return;
        }
      }
      new Notification(t('guessart.notificationTitle', 'GuessArt: Du bist dran!'), {
        body: t('guessart.pushTestBody', '🎉 Test erfolgreich! Push-Benachrichtigungen funktionieren einwandfrei.'),
        icon: '/pwa/icon_full.png',
      });
    } catch (e) {
      console.warn('[PushNotificationBanner] Failed to send test notification:', e);
    }
  }, [t]);

  if (state === 'unsupported') {
    return (
      <Alert
        icon={<NotificationsOffRoundedIcon />}
        severity="warning"
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        {t(
          'guessart.pushUnsupported',
          'Push-Benachrichtigungen werden in diesem Browser/Kontext nicht unterstützt (erfordert HTTPS oder localhost, bzw. PWA-Installation auf Mobilgeräten).',
        )}
      </Alert>
    );
  }

  if (state === 'granted') {
    return (
      <Alert
        icon={<CheckCircleRoundedIcon />}
        severity="success"
        variant="outlined"
        sx={{ borderRadius: 2 }}
        action={
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={handleTestNotification}
            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {t('guessart.pushTestButton', 'Test-Push senden')}
          </Button>
        }
      >
        {t(
          'guessart.pushEnabled',
          'Push-Benachrichtigungen aktiv – du wirst benachrichtigt, wenn du dran bist!',
        )}
      </Alert>
    );
  }

  if (state === 'denied') {
    return (
      <Alert
        icon={<NotificationsOffRoundedIcon />}
        severity="warning"
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        {t(
          'guessart.pushDenied',
          'Benachrichtigungen wurden blockiert. Aktiviere sie in deinen Browser-Einstellungen, um informiert zu werden, wenn du dran bist.',
        )}
      </Alert>
    );
  }

  // state === 'prompt'
  return (
    <Alert
      icon={<NotificationsActiveRoundedIcon />}
      severity="info"
      variant="outlined"
      sx={{ borderRadius: 2 }}
      action={
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={handleEnable}
          sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          {t('guessart.pushEnable', 'Aktivieren')}
        </Button>
      }
    >
      {t(
        'guessart.pushPrompt',
        'Aktiviere Push-Benachrichtigungen, damit du auch bei geschlossener App erfährst, wenn du dran bist!',
      )}
    </Alert>
  );
};
