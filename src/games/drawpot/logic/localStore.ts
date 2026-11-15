/**
 * What this device remembers about draw pots [ID: DRAWPOT-LOCAL-STORE]
 *
 * - `DRAWPOT_HOSTED`: pots created here, with their admin keys (newest first).
 * - `DRAWPOT_HISTORY`: per pot the draws this device made, so the result shows again on every
 *   visit, even offline or after the pot expired.
 */
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { DrawPotMode, DrawRecord } from './api';

export interface HostedPot {
  id: string;
  adminKey: string;
  title: string;
  mode: DrawPotMode;
  createdAt: number;
  expiresAt: number;
}

export interface PotHistory {
  potId: string;
  title: string;
  mode: DrawPotMode;
  /** Secret santa: the name this device claimed. */
  identityLabel?: string;
  draws: DrawRecord[];
  lastSeen: number;
}

const MAX_HOSTED = 50;
const MAX_HISTORY = 100;

export const loadHosted = (): HostedPot[] =>
  storage.getJson<HostedPot[]>(STORAGE_KEYS.DRAWPOT_HOSTED, []);

export function saveHosted(pot: HostedPot): HostedPot[] {
  const next = [pot, ...loadHosted().filter((p) => p.id !== pot.id)].slice(0, MAX_HOSTED);
  storage.setJson(STORAGE_KEYS.DRAWPOT_HOSTED, next);
  return next;
}

export function removeHosted(potId: string): HostedPot[] {
  const next = loadHosted().filter((p) => p.id !== potId);
  storage.setJson(STORAGE_KEYS.DRAWPOT_HOSTED, next);
  return next;
}

export const findHosted = (potId: string): HostedPot | undefined =>
  loadHosted().find((p) => p.id === potId);

export const loadHistory = (): PotHistory[] =>
  storage.getJson<PotHistory[]>(STORAGE_KEYS.DRAWPOT_HISTORY, []);

export const findHistory = (potId: string): PotHistory | undefined =>
  loadHistory().find((h) => h.potId === potId);

/** Merges draws by timestamp + entry so a server answer never duplicates local ones. */
export function mergeDraws(a: DrawRecord[], b: DrawRecord[]): DrawRecord[] {
  const key = (d: DrawRecord) => `${d.at}:${d.entryId}`;
  const map = new Map(a.map((d) => [key(d), d]));
  b.forEach((d) => map.set(key(d), d));
  return [...map.values()].sort((x, y) => x.at - y.at);
}

export function saveHistory(entry: Omit<PotHistory, 'lastSeen'>, now = Date.now()): PotHistory {
  const all = loadHistory();
  const prev = all.find((h) => h.potId === entry.potId);
  const merged: PotHistory = {
    ...prev,
    ...entry,
    identityLabel: entry.identityLabel ?? prev?.identityLabel,
    draws: mergeDraws(prev?.draws ?? [], entry.draws),
    lastSeen: now,
  };
  const next = [merged, ...all.filter((h) => h.potId !== entry.potId)].slice(0, MAX_HISTORY);
  storage.setJson(STORAGE_KEYS.DRAWPOT_HISTORY, next);
  return merged;
}

export function removeHistory(potId: string): PotHistory[] {
  const next = loadHistory().filter((h) => h.potId !== potId);
  storage.setJson(STORAGE_KEYS.DRAWPOT_HISTORY, next);
  return next;
}
