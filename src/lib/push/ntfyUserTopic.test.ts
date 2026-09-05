import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../storage';
import { pushClient } from './pushClient';

describe('ntfy User Topic & PushClient', () => {
  beforeEach(() => {
    storage.clear();
  });

  describe('User Topic Storage & Generation', () => {
    it('generates a unique topic starting with lgg-user- when none exists', () => {
      const topic = storage.getUserNtfyTopic();
      expect(topic).toMatch(/^lgg-user-[a-z0-9]+$/);
    });

    it('persists the generated topic across multiple calls', () => {
      const topic1 = storage.getUserNtfyTopic();
      const topic2 = storage.getUserNtfyTopic();
      expect(topic1).toBe(topic2);
    });

    it('allows setting and sanitizing a custom user topic', () => {
      storage.setUserNtfyTopic('my-custom-topic-123!');
      expect(storage.getUserNtfyTopic()).toBe('my-custom-topic-123_');
    });

    it('regenerates a new unique topic when requested', () => {
      const initialTopic = storage.getUserNtfyTopic();
      const regenerated = storage.regenerateUserNtfyTopic();
      expect(regenerated).toMatch(/^lgg-user-[a-z0-9]+$/);
      expect(regenerated).not.toBe(initialTopic);
      expect(storage.getUserNtfyTopic()).toBe(regenerated);
    });
  });

  describe('PushClient ntfy URLs & Methods', () => {
    it('returns the configured user topic from getUserNtfyTopic()', () => {
      storage.setUserNtfyTopic('test-user-topic');
      expect(pushClient.getUserNtfyTopic()).toBe('test-user-topic');
    });

    it('formats getUserNtfyUrl() with server and user topic', () => {
      storage.setNtfyServerUrl('https://ntfy.example.com');
      storage.setUserNtfyTopic('test-user-topic');
      expect(pushClient.getUserNtfyUrl()).toBe('https://ntfy.example.com/test-user-topic');
    });

    it('formats getUserNtfyAppScheme() with ntfy scheme and user topic', () => {
      storage.setNtfyServerUrl('https://ntfy.example.com');
      storage.setUserNtfyTopic('test-user-topic');
      expect(pushClient.getUserNtfyAppScheme()).toBe('ntfy://ntfy.example.com/test-user-topic');
    });

    it('defaults getNtfyUrl() to user topic when no args are provided', () => {
      storage.setNtfyServerUrl('https://ntfy.sh');
      storage.setUserNtfyTopic('alice-device-topic');
      expect(pushClient.getNtfyUrl()).toBe('https://ntfy.sh/alice-device-topic');
    });

    it('formats getNtfyUrl() for explicit lgg-user topic', () => {
      storage.setNtfyServerUrl('https://ntfy.sh');
      expect(pushClient.getNtfyUrl('lgg-user-custom123')).toBe('https://ntfy.sh/lgg-user-custom123');
    });

    it('formats getNtfyUrl() for game and player IDs', () => {
      storage.setNtfyServerUrl('https://ntfy.sh');
      expect(pushClient.getNtfyUrl('game123', 'p1')).toBe('https://ntfy.sh/lgg-game123-p1');
    });
  });

  describe('PushClient sendGamePushNotification suppression rules', () => {
    it('suppresses push notifications when sender and target player IDs match', async () => {
      const result = await pushClient.sendGamePushNotification({
        gameId: 'game-123',
        senderPlayerId: 'p1',
        targetPlayerId: 'p1',
        ntfyTopic: 'lgg-user-target',
        title: 'Test',
        body: 'Test',
      });
      expect(result).toBe(false);
    });

    it('does NOT fall back to local device user topic if target topic and player are missing', async () => {
      storage.setUserNtfyTopic('local-device-topic');
      const result = await pushClient.sendGamePushNotification({
        gameId: '',
        title: 'Test',
        body: 'Test',
      });
      // Should not dispatch to local user topic
      expect(result).toBe(false);
    });

    it('always dispatches direct ntfy when ntfyTopic is provided', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('OK', { status: 200 }));
      const result = await pushClient.sendGamePushNotification({
        gameId: 'game-123',
        senderPlayerId: 'p1',
        targetPlayerId: 'p2',
        ntfyTopic: 'lgg-user-target456',
        title: 'GuessArt: Du bist am Raten!',
        body: 'Ein neues Bild wartet auf dich!',
      });
      expect(result).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('lgg-user-target456'),
        expect.objectContaining({
          method: 'POST',
          body: 'Ein neues Bild wartet auf dich!',
        }),
      );
      fetchSpy.mockRestore();
    });
  });
});
