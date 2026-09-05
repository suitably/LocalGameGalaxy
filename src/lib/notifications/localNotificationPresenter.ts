/**
 * localNotificationPresenter.ts - Browser Notification & ServiceWorker presenter
 */

import type { ShowNotificationOptions } from './notificationTypes';

function getGlobalNotification(): typeof Notification | undefined {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return window.Notification;
  }
  if (typeof globalThis !== 'undefined' && 'Notification' in globalThis) {
    return (globalThis as unknown as { Notification: typeof Notification }).Notification;
  }
  if (typeof Notification !== 'undefined') {
    return Notification;
  }
  return undefined;
}

function getGlobalNavigator(): Navigator | undefined {
  if (typeof navigator !== 'undefined') {
    return navigator;
  }
  if (typeof window !== 'undefined' && 'navigator' in window) {
    return window.navigator;
  }
  if (typeof globalThis !== 'undefined' && 'navigator' in globalThis) {
    return (globalThis as unknown as { navigator: Navigator }).navigator;
  }
  return undefined;
}

export const localNotificationPresenter = {
  isSupported(): boolean {
    return getGlobalNotification() !== undefined;
  },

  getPermission(): NotificationPermission | 'unsupported' {
    const notif = getGlobalNotification();
    if (!notif) return 'unsupported';
    return notif.permission;
  },

  hasPermission(): boolean {
    return this.getPermission() === 'granted';
  },

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    const notif = getGlobalNotification();
    if (!notif) return 'unsupported';
    if (notif.permission === 'granted' || notif.permission === 'denied') {
      return notif.permission;
    }
    try {
      const result = await notif.requestPermission();
      return result;
    } catch {
      return notif.permission;
    }
  },

  async showNotification(options: ShowNotificationOptions): Promise<boolean> {
    if (!this.hasPermission()) {
      return false;
    }

    const { title, body, icon = '/pwa/icon_full.png', badge = '/pwa/icon_full.png', tag, url, data } = options;

    // Prefer ServiceWorker showNotification for Android PWA / mobile Chrome reliability
    const nav = getGlobalNavigator();
    if (nav && 'serviceWorker' in nav && nav.serviceWorker) {
      try {
        const sw = nav.serviceWorker;
        let registration: ServiceWorkerRegistration | undefined;
        if (sw.ready) {
          registration = await sw.ready;
        } else if (typeof sw.getRegistration === 'function') {
          registration = await sw.getRegistration();
        }

        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,
            data: data || (url ? { url } : undefined),
          });
          return true;
        }
      } catch (err) {
        console.warn('[LocalNotificationPresenter] SW notification failed, falling back to Notification constructor:', err);
      }
    }

    // Fallback to standard Notification constructor
    const NotifCtor = getGlobalNotification();
    if (NotifCtor) {
      try {
        new NotifCtor(title, {
          body,
          icon,
          tag,
        });
        return true;
      } catch (err) {
        console.warn('[LocalNotificationPresenter] Notification constructor failed:', err);
      }
    }

    return false;
  },
};
