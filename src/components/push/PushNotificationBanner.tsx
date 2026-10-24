import React, { useCallback, useEffect, useState } from 'react';
import { alpha, Alert, Box, Button, Stack, Typography } from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import { useTranslation } from 'react-i18next';
import { storage } from '../../lib/storage';
import { pushClient } from '../../lib/push/pushClient';
import { localNotificationPresenter } from '../../lib/notifications';
import { ensureSiteWebPush, needsHomeScreenInstall } from '../../lib/push/siteWebPush';

type PushPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied';

function getPermissionState(): PushPermissionState {
  return localNotificationPresenter.getPermission() as PushPermissionState;
}

interface PushNotificationBannerProps {
  gameId?: string;
  playerId?: string;
  showNtfyOption?: boolean;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  showNtfyOption = true,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<PushPermissionState>(getPermissionState);
  const [installFirst] = useState(needsHomeScreenInstall);

  // Allowed earlier: make sure this device is also subscribed with the site's push sender.
  useEffect(() => {
    if (state === 'granted') ensureSiteWebPush().catch(() => {});
  }, [state]);

  const handleEnable = useCallback(async () => {
    const result = await localNotificationPresenter.requestPermission();
    setState(result as PushPermissionState);
  }, []);

  const handleTestNotification = useCallback(async () => {
    await localNotificationPresenter.showNotification({
      title: t('guessart.notificationTitle', 'LocalGameGalaxy: Du bist dran!'),
      body: t(
        'guessart.pushTestBody',
        '🎉 Test erfolgreich! Push-Benachrichtigungen funktionieren einwandfrei.',
      ),
      icon: '/pwa/icon_full.png',
    });
  }, [t]);

  const userNtfyTopic = storage.getUserNtfyTopic();
  const ntfyUrl = pushClient.getUserNtfyUrl();

  return (
    <Stack spacing={1.5} sx={{ width: '100%' }}>
      {installFirst && (
        <Alert
          icon={<IosShareRoundedIcon />}
          severity="info"
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          {t(
            'guessart.pushIosInstall',
            'Auf dem iPhone kommen Benachrichtigungen nur in der installierten App: Teilen-Symbol → „Zum Home-Bildschirm“, dann von dort öffnen und hier aktivieren.',
          )}
        </Alert>
      )}

      {state === 'unsupported' && !installFirst && (
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

      {/* ntfy is the way for devices without browser push; with push on it lives in settings. */}
      {showNtfyOption && state !== 'granted' && (
        <Alert
          icon={<ShieldRoundedIcon color="info" />}
          severity="info"
          variant="outlined"
          sx={{
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.04),
            borderColor: (theme) => alpha(theme.palette.secondary.main, 0.3),
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
              'Erhalte Pushs ohne Google Play Services direkt in deiner ntfy-App.',
            )}
            <Typography
              variant="caption"
              sx={{ display: 'block', mt: 0.5, opacity: 0.75, fontFamily: 'monospace' }}
            >
              Topic: {userNtfyTopic}
            </Typography>
          </Box>
        </Alert>
      )}
    </Stack>
  );
};
