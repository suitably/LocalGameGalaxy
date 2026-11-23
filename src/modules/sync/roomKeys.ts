/**
 * Room keys for MQTT end-to-end encryption [ID: MODULES-SYNC-ROOM-KEYS]
 *
 * One key per party room (session storage: the party lives for a session, a reload keeps it)
 * or per "play over days" game id (local storage: the game spans days). The key is read only
 * from the URL `#fragment` (`key=`), never from the query string, which reaches the web server.
 * A room without a key is a legacy plaintext room (transition, ADR 0009).
 */
import { sessionStorageSafe, storage, STORAGE_PREFIXES } from '../../lib/storage';
import { generateRoomKey, isRoomKey } from './roomCrypto';

export type RoomKeyStore = 'session' | 'local';

const storageKey = (scopeId: string) => `${STORAGE_PREFIXES.ROOM_KEY}${scopeId}`;

/** The key of a party room or async game, or `null` (legacy plaintext room). */
export function getRoomKey(scopeId: string | null | undefined): string | null {
  if (!scopeId) return null;
  const key = sessionStorageSafe.get(storageKey(scopeId)) || storage.get(storageKey(scopeId));
  return isRoomKey(key) ? key : null;
}

export function setRoomKey(scopeId: string, key: string, store: RoomKeyStore): void {
  if (!scopeId || !isRoomKey(key)) return;
  if (store === 'session') sessionStorageSafe.set(storageKey(scopeId), key);
  else storage.set(storageKey(scopeId), key);
}

/** Host / creator: the existing key of the room, or a new one. New rooms are always encrypted. */
export function ensureRoomKey(scopeId: string, store: RoomKeyStore): string {
  const existing = getRoomKey(scopeId);
  if (existing) return existing;
  const key = generateRoomKey();
  setRoomKey(scopeId, key, store);
  return key;
}

/** Query parameters inside a fragment: `#/party?room=X&key=K` or a bare `#key=K`. */
function fragmentParams(fragment: string): URLSearchParams {
  const body = fragment.replace(/^#/, '');
  if (body.includes('?')) return new URLSearchParams(body.slice(body.indexOf('?') + 1));
  return new URLSearchParams(body.startsWith('/') ? '' : body);
}

/**
 * Stores the key an invite link carries in its fragment: under `room` (session) or, without a
 * room, under `gameId` (local). Returns the scope id it was stored for, or `null`.
 */
export function captureInviteKey(
  search = typeof window !== 'undefined' ? window.location.search : '',
  fragment = typeof window !== 'undefined' ? window.location.hash : '',
): string | null {
  const frag = fragmentParams(fragment);
  const key = frag.get('key');
  if (!isRoomKey(key)) return null;
  const query = new URLSearchParams(search);
  const room = (frag.get('room') ?? query.get('room'))?.toUpperCase().trim();
  if (room) {
    setRoomKey(room, key, 'session');
    return room;
  }
  const gameId = frag.get('gameId') ?? query.get('gameId');
  if (!gameId) return null;
  setRoomKey(gameId, key, 'local');
  return gameId;
}

/** `&key=<key>` for a link whose fragment already has a query, or `''` without a key. */
export const roomKeyParam = (key: string | null | undefined): string =>
  isRoomKey(key) ? `&key=${key}` : '';
