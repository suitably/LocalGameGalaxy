import { beforeEach, describe, expect, it } from 'vitest';
import { sessionStorageSafe, storage, STORAGE_KEYS } from '../../../lib/storage';
import {
  cleanStammtischName,
  findStammtisch,
  getAutoOpenStammtisch,
  loadStammtische,
  removeStammtisch,
  renameStammtisch,
  saveStammtische,
  setAutoOpenStammtisch,
  takeAutoOpenStammtisch,
  upsertStammtisch,
  type StammtischRoom,
} from './stammtisch';

const room = (roomId: string, extra: Partial<StammtischRoom> = {}): StammtischRoom => ({
  roomId,
  roomKey: null,
  name: 'Stammtisch',
  playerId: `p_${roomId}`,
  savedAt: 1,
  ...extra,
});

describe('stammtisch list', () => {
  it('adds a room and replaces the entry with the same id in place', () => {
    const list = upsertStammtisch(upsertStammtisch([], room('A')), room('B'));
    const next = upsertStammtisch(list, room('A', { name: 'Familie' }));
    expect(next.map((r) => [r.roomId, r.name])).toEqual([
      ['A', 'Familie'],
      ['B', 'Stammtisch'],
    ]);
  });

  it('cleans names and falls back to the default', () => {
    expect(cleanStammtischName('  Doppel   kopf ')).toBe('Doppel kopf');
    expect(cleanStammtischName('   ')).toBe('Stammtisch');
    expect(cleanStammtischName('x'.repeat(60))).toHaveLength(40);
  });

  it('renames, removes and finds', () => {
    const list = [room('A'), room('B')];
    expect(findStammtisch(renameStammtisch(list, 'B', 'Freunde'), 'B')?.name).toBe('Freunde');
    expect(removeStammtisch(list, 'A').map((r) => r.roomId)).toEqual(['B']);
    expect(findStammtisch(list, null)).toBeNull();
  });
});

describe('stammtisch storage', () => {
  beforeEach(() => {
    storage.remove(STORAGE_KEYS.STAMMTISCH_ROOMS);
    storage.remove(STORAGE_KEYS.STAMMTISCH_AUTO_OPEN);
    sessionStorageSafe.remove(STORAGE_KEYS.STAMMTISCH_AUTO_OPENED);
  });

  it('keeps only valid entries when loading', () => {
    storage.setJson(STORAGE_KEYS.STAMMTISCH_ROOMS, [room('A'), { roomId: 'B' }, null]);
    expect(loadStammtische().map((r) => r.roomId)).toEqual(['A']);
  });

  it('drops the auto-open entry together with its room', () => {
    saveStammtische([room('A')]);
    setAutoOpenStammtisch('A');
    saveStammtische([]);
    expect(getAutoOpenStammtisch()).toBeNull();
  });

  it('auto-opens once per app session', () => {
    const list = [room('A')];
    saveStammtische(list);
    setAutoOpenStammtisch('A');
    expect(takeAutoOpenStammtisch(list)?.roomId).toBe('A');
    expect(takeAutoOpenStammtisch(list)).toBeNull();
  });
});
