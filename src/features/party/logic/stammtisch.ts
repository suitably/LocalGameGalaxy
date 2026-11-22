/**
 * Stammtisch: party rooms this device keeps [ID: LOGIC-PARTY-STAMMTISCH]
 *
 * A Stammtisch is an ordinary party room whose code and key never change, saved on every member's
 * device together with the player id this device uses there, so a member comes back as the same
 * player on any later day. One saved room can be opened on app start (per device, off by default).
 */
import { sessionStorageSafe, storage, STORAGE_KEYS } from '../../../lib/storage';

export interface StammtischRoom {
  roomId: string;
  /** Room key (ADR 0009); `null` for a legacy plaintext room. */
  roomKey: string | null;
  name: string;
  /** Player id this device uses in the room, so returning keeps the same roster entry. */
  playerId: string;
  savedAt: number;
}

export const DEFAULT_STAMMTISCH_NAME = 'Stammtisch';
const MAX_NAME = 40;

export const cleanStammtischName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME) || DEFAULT_STAMMTISCH_NAME;

/** Adds the room, or replaces the saved entry with the same room id (kept in its place). */
export function upsertStammtisch(list: StammtischRoom[], room: StammtischRoom): StammtischRoom[] {
  const entry = { ...room, name: cleanStammtischName(room.name) };
  const index = list.findIndex((r) => r.roomId === room.roomId);
  if (index < 0) return [...list, entry];
  const next = [...list];
  next[index] = entry;
  return next;
}

export const removeStammtisch = (list: StammtischRoom[], roomId: string): StammtischRoom[] =>
  list.filter((r) => r.roomId !== roomId);

export const renameStammtisch = (
  list: StammtischRoom[],
  roomId: string,
  name: string,
): StammtischRoom[] =>
  list.map((r) => (r.roomId === roomId ? { ...r, name: cleanStammtischName(name) } : r));

export const findStammtisch = (
  list: StammtischRoom[],
  roomId: string | null | undefined,
): StammtischRoom | null => list.find((r) => r.roomId === roomId) ?? null;

const isRoom = (r: unknown): r is StammtischRoom => {
  const o = r as Partial<StammtischRoom> | null;
  return (
    typeof o?.roomId === 'string' &&
    o.roomId.length > 0 &&
    typeof o.name === 'string' &&
    typeof o.playerId === 'string' &&
    o.playerId.length > 0
  );
};

export function loadStammtische(): StammtischRoom[] {
  const raw = storage.getJson<unknown>(STORAGE_KEYS.STAMMTISCH_ROOMS, []);
  return Array.isArray(raw) ? raw.filter(isRoom) : [];
}

export function saveStammtische(list: StammtischRoom[]): void {
  storage.setJson(STORAGE_KEYS.STAMMTISCH_ROOMS, list);
  // An auto-open entry for a removed room goes with it.
  const auto = getAutoOpenStammtisch();
  if (auto && !findStammtisch(list, auto)) setAutoOpenStammtisch(null);
}

export const getAutoOpenStammtisch = (): string | null =>
  storage.get(STORAGE_KEYS.STAMMTISCH_AUTO_OPEN) || null;

export function setAutoOpenStammtisch(roomId: string | null): void {
  if (roomId) storage.set(STORAGE_KEYS.STAMMTISCH_AUTO_OPEN, roomId);
  else storage.remove(STORAGE_KEYS.STAMMTISCH_AUTO_OPEN);
}

/**
 * The saved room to open on this app start, or `null`. Answers once per app session, so going
 * back to the hub from the room does not jump straight back in.
 */
export function takeAutoOpenStammtisch(list: StammtischRoom[]): StammtischRoom | null {
  if (sessionStorageSafe.get(STORAGE_KEYS.STAMMTISCH_AUTO_OPENED)) return null;
  sessionStorageSafe.set(STORAGE_KEYS.STAMMTISCH_AUTO_OPENED, '1');
  return findStammtisch(list, getAutoOpenStammtisch());
}
