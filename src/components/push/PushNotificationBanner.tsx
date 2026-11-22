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

/** On a narrow screen the action button wraps below the text instead of squeezing it. */
const alertSx = {
  borderRadius: 2,
  width: '100%',
  flexWrap: 'wrap',
  '& .MuiAlert-message': { flex: '1 1 10rem', minWidth: 0 },
  '& .MuiAlert-action': { ml: 'auto', pl: 1, pt: 0, alignItems: 'center' },
} as const;

function getPermissionState(): PushPermissionState {
  return localNotificationPresenter.getPermission() as PushPermissionState;
}

interface PushNotificationBannerProps {
  gameId?: string;
  playerId?: string;
  showNtfyOption?: boolean;
  /** Replaces the collapsed "notifications are off" row, e.g. to close a surrounding dialog. */
  onDismiss?: () => void;
  /** Called once the user turned on the device channel or picked ntfy. */
  onChosen?: () => void;
}

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({
  showNtfyOption = true,
  onDismiss,
  onChosen,
}) => {
  const { t } = useTranslation();
  const [state, setState] = useState<PushPermissionState>(getPermissionState);
  const [installFirst] = useState(needsHomeScreenInstall);
  const [method, setMethod] = useState(() => storage.getNotificationMethod());
  const [dismissed, setDismissed] = useState(false);
  const status = getDeviceChannelStatus(state, installFirst);

  const choose = useCallback(
    (choice: 'device' | 'ntfy') => {
      const next = methodForChoice(choice, storage.getNotificationMethod());
      storage.setNotificationMethod(next);
      setMethod(next);
      onChosen?.();
    },
    [onChosen],
  );

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
      title: t('guessart.notificationTitle'),
      body: t('guessart.pushTestBody'),
      icon: '/pwa/icon_full.png',
    });
  }, [t]);

  if (status === 'active') {
    return (
      <Alert
        icon={<CheckCircleRoundedIcon />}
        severity="success"
        variant="outlined"
        sx={alertSx}
        action={
          <Button
            size="small"
            variant="outlined"
            color="success"
            onClick={handleTestNotification}
            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            {t('guessart.pushTestButton')}
          </Button>
        }
      >
        {t('guessart.pushEnabled')}
      </Alert>
    );
  }

  if (dismissed) {
    return (
      <Alert
        icon={<NotificationsOffRoundedIcon />}
        severity="info"
        variant="outlined"
        sx={alertSx}
        action={
          <Button
            size="small"
            onClick={() => setDismissed(false)}
            sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {t('settings.notify_set_up')}
          </Button>
        }
      >
        {t('settings.notify_off')}
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
      onDismiss={onDismiss ?? (() => setDismissed(true))}
    />
  );
};
