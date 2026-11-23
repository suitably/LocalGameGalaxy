/**
 * Centralized Storage Service [ID: LIB-STORAGE]
 * Public entry point: re-exports the storage core (`./storageCore`) and adds the deprecated
 * feature-settings delegates. The settings modules import `./storageCore` directly, which keeps
 * the import graph acyclic (docs/tech/coding-conventions.md).
 */

import { storage as coreStorage } from './storageCore';
import * as companion from './companion/companionSettings';
import * as signaling from './webrtc/signalingSettings';
import * as push from './push/pushSettings';

export { STORAGE_KEYS, STORAGE_PREFIXES, sessionStorageSafe } from './storageCore';

export const storage = Object.assign(coreStorage, {
  // Feature settings moved to their owners (#419); thin delegates kept for existing call sites.
  /** @deprecated Use `getHelperUrl` from `lib/companion/companionSettings`. */
  getHelperUrl: () => companion.getHelperUrl(),
  /** @deprecated Use `setHelperUrl` from `lib/companion/companionSettings`. */
  setHelperUrl: (url: string) => companion.setHelperUrl(url),
  /** @deprecated Use `getHelperToken` from `lib/companion/companionSettings`. */
  getHelperToken: () => companion.getHelperToken(),
  /** @deprecated Use `setHelperToken` from `lib/companion/companionSettings`. */
  setHelperToken: (token: string) => companion.setHelperToken(token),
  /** @deprecated Use `isHelperActive` from `lib/companion/companionSettings`. */
  isHelperActive: () => companion.isHelperActive(),
  /** @deprecated Use `setHelperActive` from `lib/companion/companionSettings`. */
  setHelperActive: (active: boolean) => companion.setHelperActive(active),
  /** @deprecated Use `getSignalingUrl` from `lib/webrtc/signalingSettings`. */
  getSignalingUrl: () => signaling.getSignalingUrl(),
  /** @deprecated Use `setSignalingUrl` from `lib/webrtc/signalingSettings`. */
  setSignalingUrl: (url: string) => signaling.setSignalingUrl(url),
  /** @deprecated Use `getDisabledTrackerUrls` from `lib/webrtc/signalingSettings`. */
  getDisabledTrackerUrls: (gameId?: string) => signaling.getDisabledTrackerUrls(gameId),
  /** @deprecated Use `setDisabledTrackerUrls` from `lib/webrtc/signalingSettings`. */
  setDisabledTrackerUrls: (urls: string[], gameId?: string) =>
    signaling.setDisabledTrackerUrls(urls, gameId),
  /** @deprecated Use `getPushRelayUrl` from `lib/push/pushSettings`. */
  getPushRelayUrl: () => push.getPushRelayUrl(),
  /** @deprecated Use `setPushRelayUrl` from `lib/push/pushSettings`. */
  setPushRelayUrl: (url: string) => push.setPushRelayUrl(url),
  /** @deprecated Use `getNotificationMethod` from `lib/push/pushSettings`. */
  getNotificationMethod: () => push.getNotificationMethod(),
  /** @deprecated Use `setNotificationMethod` from `lib/push/pushSettings`. */
  setNotificationMethod: (method: push.NotificationMethod) => push.setNotificationMethod(method),
  /** @deprecated Use `getNtfyServerUrl` from `lib/push/pushSettings`. */
  getNtfyServerUrl: () => push.getNtfyServerUrl(),
  /** @deprecated Use `setNtfyServerUrl` from `lib/push/pushSettings`. */
  setNtfyServerUrl: (url: string) => push.setNtfyServerUrl(url),
  /** @deprecated Use `getUserNtfyTopic` from `lib/push/pushSettings`. */
  getUserNtfyTopic: () => push.getUserNtfyTopic(),
  /** @deprecated Use `setUserNtfyTopic` from `lib/push/pushSettings`. */
  setUserNtfyTopic: (topic: string) => push.setUserNtfyTopic(topic),
  /** @deprecated Use `regenerateUserNtfyTopic` from `lib/push/pushSettings`. */
  regenerateUserNtfyTopic: () => push.regenerateUserNtfyTopic(),
});

/** @deprecated Import from `lib/push/pushSettings`. */
export { generateUserNtfyTopic } from './push/pushSettings';
