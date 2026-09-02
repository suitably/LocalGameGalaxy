/**
 * gameRelayStorage.ts - Game-Scoped Relay URL Storage
 *
 * Stores relay and push server URLs strictly inside sessionStorage per game session.
 * This guarantees that guest players use the host's relay for the shared match
 * without altering their own global server configuration in localStorage.
 */

import { storage } from '../storage';

const SESSION_PREFIX = 'galaxy_game_relay_';

export const gameRelayStorage = {
  /**
   * Sets the relay URL for a specific game room/session.
   */
  setGameRelay(gameId: string, relayUrl: string): void {
    if (typeof window === 'undefined' || !gameId) return;
    const cleanUrl = relayUrl ? relayUrl.trim().replace(/\/$/, '') : '';
    if (cleanUrl) {
      sessionStorage.setItem(`${SESSION_PREFIX}${gameId}`, cleanUrl);
    } else {
      sessionStorage.removeItem(`${SESSION_PREFIX}${gameId}`);
    }
  },

  /**
   * Gets the relay URL for a specific game room.
   * Priority:
   * 1. Ephemeral sessionStorage for this specific game
   * 2. Host's active helper server URL (if enabled in localStorage)
   */
  getGameRelay(gameId: string): string | null {
    if (typeof window === 'undefined' || !gameId) return null;

    // 1. Check session storage for this game
    const sessionRelay = sessionStorage.getItem(`${SESSION_PREFIX}${gameId}`);
    if (sessionRelay) {
      return sessionRelay;
    }

    // 2. Fallback to host's own server if active
    if (storage.isHelperActive()) {
      const helperUrl = storage.getHelperUrl();
      if (helperUrl) {
        return helperUrl.trim().replace(/\/$/, '');
      }
    }

    return null;
  },

  /**
   * Clears game-specific relay storage.
   */
  clearGameRelay(gameId: string): void {
    if (typeof window === 'undefined' || !gameId) return;
    sessionStorage.removeItem(`${SESSION_PREFIX}${gameId}`);
  },
};
