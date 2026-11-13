import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent } from '@mui/material';
import { localNotificationPresenter } from '../../lib/notifications';
import { needsHomeScreenInstall } from '../../lib/push/siteWebPush';
import {
  getNotificationMethod,
  isNotificationChoiceDismissed,
  setNotificationChoiceDismissed,
} from '../../lib/push/pushSettings';
import {
  getDeviceChannelStatus,
  shouldAskForChannel,
  type NotificationPermissionState,
} from '../../lib/push/notificationChannels';
import { PushNotificationBanner } from './PushNotificationBanner';

function shouldOpen(): boolean {
  const permission = localNotificationPresenter.getPermission() as NotificationPermissionState;
  return shouldAskForChannel(
    getDeviceChannelStatus(permission, needsHomeScreenInstall()),
    getNotificationMethod(),
    isNotificationChoiceDismissed(),
  );
}

/**
 * Opens once when a game with turn notifications starts and nothing is decided yet. It stands in
 * for asking the browser on mount: the system prompt only follows the user's own choice here.
 */
export const NotificationChoiceDialog: React.FC = () => {
  const [open, setOpen] = useState(shouldOpen);

  // Any way out counts as an answer, so the dialog never comes back on its own; the same
  // chooser stays reachable in the settings and the share dialogs.
  const close = useCallback(() => {
    setNotificationChoiceDismissed(true);
    setOpen(false);
  }, []);

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogContent>
        <PushNotificationBanner onDismiss={close} onChosen={close} />
      </DialogContent>
    </Dialog>
  );
};
