import React, { useCallback, useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { useTranslation } from 'react-i18next';
import { pushClient } from '../../lib/push/pushClient';

type PushPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied';

function getPermissionState(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

interface PushNotificationBannerProps {
  gameId?: string;
  playerId?: string;
  showNtfyOption?: boolean;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  gameId,
  playerId,
  showNtfyOption = true,
}) => {
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
          await reg.showNotification(t('guessart.notificationTitle', 'LocalGameGalaxy: Du bist dran!'), {
            body: t('guessart.pushTestBody', '🎉 Test erfolgreich! Push-Benachrichtigungen funktionieren einwandfrei.'),
            icon: '/pwa/icon_full.png',
          });
          return;
        }
      }
      new Notification(t('guessart.notificationTitle', 'LocalGameGalaxy: Du bist dran!'), {
        body: t('guessart.pushTestBody', '🎉 Test erfolgreich! Push-Benachrichtigungen funktionieren einwandfrei.'),
        icon: '/pwa/icon_full.png',
      });
    } catch (e) {
      console.warn('[PushNotificationBanner] Failed to send test notification:', e);
    }
  }, [t]);

  const ntfyUrl = gameId
    ? pushClient.getNtfyUrl(gameId, playerId)
    : pushClient.getNtfyUrl('test', 'device');

  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {state === 'unsupported' && (
        <Alert
          icon={<NotificationsOffRoundedIcon />}
          severity="warning"
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          {t(
            'guessart.pushUnsupported',
            'Web-Push wird in diesem Browser/Kontext nicht unterstützt. Nutze unten die Google-freie ntfy-Option!',
          )}
        </Alert>
      )}

      {state === 'granted' && (
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
            'Browser-Push aktiv – du wirst benachrichtigt, wenn du dran bist!',
          )}
        </Alert>
      )}

      {state === 'denied' && (
        <Alert
          icon={<NotificationsOffRoundedIcon />}
          severity="warning"
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          {t(
            'guessart.pushDenied',
            'Browser-Benachrichtigungen wurden blockiert. Du kannst alternativ die Google-freie ntfy-Option nutzen.',
          )}
        </Alert>
      )}

      {state === 'prompt' && (
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
      )}

      {showNtfyOption && (
        <Alert
          icon={<ShieldRoundedIcon color="info" />}
          severity="info"
          variant="outlined"
          sx={{
            borderRadius: 2,
            bgcolor: 'rgba(2, 136, 209, 0.04)',
            borderColor: 'rgba(2, 136, 209, 0.3)',
          }}
          action={
            <Button
              size="small"
              variant="outlined"
              color="info"
              component="a"
              href={ntfyUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewRoundedIcon />}
              sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {t('settings.ntfy_subscribe_btn', 'In ntfy abonnieren')}
            </Button>
          }
        >
          <Box>
            <Box component="strong" sx={{ display: 'block', mb: 0.25 }}>
              {t('settings.ntfy_badge_title', '100% Google-frei via ntfy')}
            </Box>
            {t(
              'settings.ntfy_badge_desc',
              'Ideal für Fairphone, Murena /e/OS und F-Droid: Erhalte Pushs ohne Google Play Services direkt in deiner ntfy-App.',
            )}
          </Box>
        </Alert>
      )}
    </Stack>
  );
};
