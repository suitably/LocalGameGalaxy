import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { localNotificationPresenter } from './localNotificationPresenter';

describe('localNotificationPresenter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects support correctly', () => {
    vi.stubGlobal('Notification', {
      permission: 'granted',
    });
    expect(localNotificationPresenter.isSupported()).toBe(true);

    vi.stubGlobal('Notification', undefined);
    expect(localNotificationPresenter.isSupported()).toBe(false);
  });

  it('returns false when trying to show notification without permission', async () => {
    vi.stubGlobal('Notification', {
      permission: 'denied',
      requestPermission: vi.fn(),
    });

    const res = await localNotificationPresenter.showNotification({
      title: 'Test',
      body: 'Test body',
    });

    expect(res).toBe(false);
  });

  it('shows notification via Notification constructor when permission is granted and no SW', async () => {
    const notificationConstructorMock = vi.fn();
    Object.assign(notificationConstructorMock, {
      permission: 'granted',
      requestPermission: vi.fn(),
    });
    vi.stubGlobal('Notification', notificationConstructorMock);
    vi.stubGlobal('navigator', {});

    const res = await localNotificationPresenter.showNotification({
      title: 'Title 1',
      body: 'Body 1',
      tag: 'tag-1',
    });

    expect(res).toBe(true);
    expect(notificationConstructorMock).toHaveBeenCalledWith('Title 1', {
      body: 'Body 1',
      icon: '/pwa/icon_full.png',
      tag: 'tag-1',
    });
  });

  it('shows notification via ServiceWorker when ready', async () => {
    const showNotificationMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn(),
    });

    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          showNotification: showNotificationMock,
        }),
      },
    });

    const res = await localNotificationPresenter.showNotification({
      title: 'Title SW',
      body: 'Body SW',
      tag: 'tag-sw',
      url: 'https://example.com/play',
    });

    expect(res).toBe(true);
    expect(showNotificationMock).toHaveBeenCalledWith('Title SW', {
      body: 'Body SW',
      icon: '/pwa/icon_full.png',
      badge: '/pwa/icon_full.png',
      tag: 'tag-sw',
      data: { url: 'https://example.com/play' },
    });
  });
});
