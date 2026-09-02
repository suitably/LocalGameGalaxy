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

  if (state === 'unsupported') return null;

  if (state === 'granted') {
    return (
      <Alert
        icon={<CheckCircleRoundedIcon />}
        severity="success"
        variant="outlined"
        sx={{ borderRadius: 2 }}
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
