import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUserNtfyTopic, storage, STORAGE_KEYS } from './storage';

describe('generateUserNtfyTopic', () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    vi.restoreAllMocks();
    if (globalThis.crypto !== originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
  });

  describe('with Web Crypto API available', () => {
    it('generates topic with lgg-user- prefix and 16 hex characters', () => {
      const topic = generateUserNtfyTopic();
      expect(topic).toMatch(/^lgg-user-[0-9a-f]{16}$/);
      expect(topic.length).toBe(25);
    });

    it('generates unique topics on consecutive calls', () => {
      const topics = new Set(Array.from({ length: 20 }, () => generateUserNtfyTopic()));
      expect(topics.size).toBe(20);
    });
  });

  describe('fallback when Web Crypto API is unavailable', () => {
    it('uses Math.random fallback when crypto.getRandomValues is undefined', () => {
      const mockCrypto = { ...globalThis.crypto, getRandomValues: undefined };
      Object.defineProperty(globalThis, 'crypto', {
        value: mockCrypto,
        writable: true,
        configurable: true,
      });

      const topic = generateUserNtfyTopic();
      expect(topic).toMatch(/^lgg-user-[a-z0-9]{16}$/);
      expect(topic.length).toBe(25);
    });

    it('uses Math.random fallback when globalThis.crypto is undefined', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const topic = generateUserNtfyTopic();
      expect(topic).toMatch(/^lgg-user-[a-z0-9]{16}$/);
      expect(topic.length).toBe(25);
    });
  });

  describe('storage ntfy topic integration', () => {
    beforeEach(() => {
      storage.clear();
    });

    it('getUserNtfyTopic generates and stores a new topic if none exists', () => {
      const topic = storage.getUserNtfyTopic();
      expect(topic).toMatch(/^lgg-user-[a-z0-9]{16}$/);
      expect(storage.get(STORAGE_KEYS.NTFY_TOPIC)).toBe(topic);
    });

    it('regenerateUserNtfyTopic creates a new topic and replaces existing one', () => {
      const firstTopic = storage.getUserNtfyTopic();
      const newTopic = storage.regenerateUserNtfyTopic();

      expect(newTopic).toMatch(/^lgg-user-[a-z0-9]{16}$/);
      expect(newTopic).not.toBe(firstTopic);
      expect(storage.getUserNtfyTopic()).toBe(newTopic);
    });
  });
});
