import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button } from '@mui/material';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useTranslation } from 'react-i18next';
import { storage } from '../../lib/storage';
import { pushClient } from '../../lib/push/pushClient';
import { localNotificationPresenter } from '../../lib/notifications';
import { ensureSiteWebPush, needsHomeScreenInstall } from '../../lib/push/siteWebPush';
import {
  getDeviceChannelStatus,
  methodForChoice,
  recommendedChoice,
  type NotificationPermissionState as PushPermissionState,
} from '../../lib/push/notificationChannels';
import { NotificationChannelChooser } from './NotificationChannelChooser';

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
  const [method, setMethod] = useState(() => storage.getNotificationMethod());
  const [dismissed, setDismissed] = useState(false);
  const status = getDeviceChannelStatus(state, installFirst);

  const choose = useCallback((choice: 'device' | 'ntfy') => {
    const next = methodForChoice(choice, storage.getNotificationMethod());
    storage.setNotificationMethod(next);
    setMethod(next);
  }, []);

  // Allowed earlier: make sure this device is also subscribed with the site's push sender.
  useEffect(() => {
    if (state === 'granted') ensureSiteWebPush().catch(() => {});
  }, [state]);

  const handleEnable = useCallback(async () => {
    // Called straight from the tap: the system prompt needs the user gesture.
    const result = await localNotificationPresenter.requestPermission();
    setState(result as PushPermissionState);
    if (result === 'granted') choose('device');
  }, [choose]);

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

  if (status === 'active') {
    return (
      <Alert
        icon={<CheckCircleRoundedIcon />}
        severity="success"
        variant="outlined"
        sx={{ borderRadius: 2, width: '100%' }}
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
    );
  }

  if (dismissed) {
    return (
      <Alert
        icon={<NotificationsOffRoundedIcon />}
        severity="info"
        variant="outlined"
        sx={{ borderRadius: 2, width: '100%' }}
        action={
          <Button
            size="small"
            onClick={() => setDismissed(false)}
            sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {t('settings.notify_set_up', 'Einrichten')}
          </Button>
        }
      >
        {t('settings.notify_off', 'Benachrichtigungen sind aus.')}
      </Alert>
    );
  }

  return (
    <NotificationChannelChooser
      status={status}
      recommended={recommendedChoice(status)}
      showNtfy={showNtfyOption}
      ntfySelected={method === 'ntfy'}
      ntfyUrl={pushClient.getUserNtfyUrl()}
      onEnableDevice={handleEnable}
      onChooseNtfy={() => choose('ntfy')}
      onDismiss={() => setDismissed(true)}
    />
  );
};
