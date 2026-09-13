/**
 * gameRelayStorage.ts - Game-Scoped Relay URL Storage
 *
 * Stores relay and push server URLs in persistent storage per game session.
 * Using persistent storage ensures the relay URL survives
 * tab/app closures, which is critical for Web Push registration to persist
 * when the browser is closed and reopened.
 *
 * Each entry is stored with a timestamp and automatically cleaned up after 7 days.
 */

import { storage, STORAGE_PREFIXES } from '../storage';

const STORAGE_PREFIX = STORAGE_PREFIXES.GAME_RELAY;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface RelayEntry {
  url: string;
  updatedAt: number;
}

export const gameRelayStorage = {
  /**
   * Sets the relay URL for a specific game room/session.
   */
  setGameRelay(gameId: string, relayUrl: string): void {
    if (typeof window === 'undefined' || !gameId) return;
    const cleanUrl = relayUrl ? relayUrl.trim().replace(/\/$/, '') : '';
    if (cleanUrl) {
      const entry: RelayEntry = { url: cleanUrl, updatedAt: Date.now() };
      storage.setJson(`${STORAGE_PREFIX}${gameId}`, entry);
    } else {
      storage.remove(`${STORAGE_PREFIX}${gameId}`);
    }

    // Opportunistically clean up stale entries
    this.cleanupStaleEntries();
  },

  /**
   * Gets the relay URL for a specific game room.
   * Priority:
   * 1. Persistent storage for this specific game (with TTL check)
   * 2. Host's active helper server URL (if enabled in storage)
   */
  getGameRelay(gameId: string): string | null {
    if (typeof window === 'undefined' || !gameId) return null;

    // 1. Check storage for this game
    const raw = storage.get(`${STORAGE_PREFIX}${gameId}`);
    if (raw) {
      try {
        const entry: RelayEntry = JSON.parse(raw);
        // Check TTL - discard if older than 7 days
        if (Date.now() - entry.updatedAt < MAX_AGE_MS) {
          return entry.url;
        }
        // Expired — remove silently
        storage.remove(`${STORAGE_PREFIX}${gameId}`);
      } catch {
        // Legacy format (plain string from old sessionStorage version) — migrate
        const legacyUrl = raw.trim();
        if (legacyUrl && !legacyUrl.startsWith('{')) {
          const entry: RelayEntry = { url: legacyUrl, updatedAt: Date.now() };
          storage.setJson(`${STORAGE_PREFIX}${gameId}`, entry);
          return legacyUrl;
        }
      }
    }

    // 2. Fallback to global push relay URL (configured in Settings → Notifications)
    return storage.getPushRelayUrl();
  },

  /**
   * Resolves the receiver's effective relay URL:
   * 1. Receiver's own relay URL if specified on their player record
   * 2. Fallback to game-level host relay
   */
  getEffectiveRelay(gameId: string, playerRelayUrl?: string): string | null {
    if (playerRelayUrl && playerRelayUrl.trim()) {
      return playerRelayUrl.trim().replace(/\/$/, '');
    }
    return this.getGameRelay(gameId);
  },

  /**
   * Clears game-specific relay storage.
   */
  clearGameRelay(gameId: string): void {
    if (typeof window === 'undefined' || !gameId) return;
    storage.remove(`${STORAGE_PREFIX}${gameId}`);
  },

  /**
   * Removes stale relay entries older than MAX_AGE_MS.
   * Runs opportunistically during setGameRelay to avoid buildup.
   */
  cleanupStaleEntries(): void {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    const keys = storage.findKeysWithPrefix(STORAGE_PREFIX);

    for (const key of keys) {
      try {
        const raw = storage.get(key);
        if (!raw) continue;
        const entry: RelayEntry = JSON.parse(raw);
        if (now - entry.updatedAt >= MAX_AGE_MS) {
          storage.remove(key);
        }
      } catch {
        // Invalid entry — remove
        storage.remove(key);
      }
    }
  },
};
