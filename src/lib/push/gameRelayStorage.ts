/**
 * gameRelayStorage.ts - Game-Scoped Relay URL Storage
 *
 * Stores relay and push server URLs in localStorage per game session.
 * Using localStorage (instead of sessionStorage) ensures the relay URL survives
 * tab/app closures, which is critical for Web Push registration to persist
 * when the browser is closed and reopened.
 *
 * Each entry is stored with a timestamp and automatically cleaned up after 7 days.
 */

import { storage } from '../storage';

const STORAGE_PREFIX = 'galaxy_game_relay_';
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
      localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, JSON.stringify(entry));
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
    }

    // Opportunistically clean up stale entries
    this.cleanupStaleEntries();
  },

  /**
   * Gets the relay URL for a specific game room.
   * Priority:
   * 1. Persistent localStorage for this specific game (with TTL check)
   * 2. Host's active helper server URL (if enabled in localStorage)
   */
  getGameRelay(gameId: string): string | null {
    if (typeof window === 'undefined' || !gameId) return null;

    // 1. Check localStorage for this game
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
    if (raw) {
      try {
        const entry: RelayEntry = JSON.parse(raw);
        // Check TTL - discard if older than 7 days
        if (Date.now() - entry.updatedAt < MAX_AGE_MS) {
          return entry.url;
        }
        // Expired — remove silently
        localStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
      } catch {
        // Legacy format (plain string from old sessionStorage version) — migrate
        const legacyUrl = raw.trim();
        if (legacyUrl && !legacyUrl.startsWith('{')) {
          const entry: RelayEntry = { url: legacyUrl, updatedAt: Date.now() };
          localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, JSON.stringify(entry));
          return legacyUrl;
        }
        localStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
      }
    }

    // 2. Fallback to global push relay URL (configured in Settings → Notifications)
    const pushRelayUrl = storage.getPushRelayUrl();
    if (pushRelayUrl) {
      return pushRelayUrl;
    }

    // 3. Fallback to host's own Nexumia server if active
    if (storage.isHelperActive()) {
      const helperUrl = storage.getHelperUrl();
      if (helperUrl) {
        return helperUrl.trim().replace(/\/$/, '');
      }
    }

    return null;
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
    localStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
  },

  /**
   * Removes stale relay entries older than MAX_AGE_MS.
   * Runs opportunistically during setGameRelay to avoid buildup.
   */
  cleanupStaleEntries(): void {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const entry: RelayEntry = JSON.parse(raw);
        if (now - entry.updatedAt >= MAX_AGE_MS) {
          keysToRemove.push(key);
        }
      } catch {
        // Invalid entry — remove
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  },
};
