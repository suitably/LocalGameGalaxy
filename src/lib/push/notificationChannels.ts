/**
 * Which notification channels this device can offer, decided before the system permission prompt
 * is ever shown [ID: LIB-PUSH-CHANNELS]
 */
import type { NotificationMethod } from './pushTypes';

/** The two ways a user can pick: the system's own push (Web Push via Apple/Google) or the ntfy app. */
export type NotificationChoice = 'device' | 'ntfy';

/**
 * State of the system channel on this device:
 * `available` can be asked for, `active` is granted, `install-first` is iOS outside the installed
 * app, `blocked` was denied in the browser, `unsupported` has no notification API at all.
 */
export type DeviceChannelStatus =
  'available' | 'active' | 'install-first' | 'blocked' | 'unsupported';

export type NotificationPermissionState =
  'unsupported' | 'prompt' | 'default' | 'granted' | 'denied';

export function getDeviceChannelStatus(
  permission: NotificationPermissionState,
  needsInstall: boolean,
): DeviceChannelStatus {
  if (permission === 'granted') return 'active';
  if (needsInstall) return 'install-first';
  if (permission === 'denied') return 'blocked';
  if (permission === 'unsupported') return 'unsupported';
  return 'available';
}

/** The system channel is recommended whenever one tap can turn it on; otherwise ntfy. */
export function recommendedChoice(status: DeviceChannelStatus): NotificationChoice {
  return status === 'available' || status === 'active' ? 'device' : 'ntfy';
}

/**
 * The stored method after a choice. Picking ntfy makes it the only channel; picking the device
 * only undoes an earlier ntfy-only choice and otherwise keeps what was set (e.g. `both`).
 */
export function methodForChoice(
  choice: NotificationChoice,
  current: NotificationMethod,
): NotificationMethod {
  if (choice === 'ntfy') return 'ntfy';
  return current === 'ntfy' ? 'auto' : current;
}
