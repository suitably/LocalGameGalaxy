import { describe, it, expect, beforeEach } from 'vitest';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import {
  BOT_PLAYER_CONFIG,
  assignMicSlots,
  buildInitialConfigs,
  isWantedByHost,
  loadSessionInputs,
} from './sessionRoster';
import type { ActivePlayer } from '../../types';

const local = (profileId: string, fields: Partial<ActivePlayer> = {}): ActivePlayer => ({
  profileId,
  deviceId: '',
  ...fields,
});

describe('sessionRoster (#418)', () => {
  beforeEach(() => {
    storage.remove(STORAGE_KEYS.PROFILES);
    storage.remove(STORAGE_KEYS.ACTIVE_SESSION);
    storage.remove(STORAGE_KEYS.MELODIQ_MIC_SLOTS);
  });

  it('loadSessionInputs reads storage with typed fallbacks and honours an override', () => {
    expect(loadSessionInputs()).toEqual({ profiles: null, activeSession: [], micSlots: [] });
    storage.set(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify([local('a')]));
    storage.set(STORAGE_KEYS.MELODIQ_MIC_SLOTS, 'not json');
    const override = [local('b')];
    expect(loadSessionInputs(override).activeSession).toBe(override);
    expect(loadSessionInputs().activeSession).toEqual([local('a')]);
    expect(loadSessionInputs().micSlots).toEqual([]);
  });

  it('assignMicSlots gives local singers slots in order and drops those without one', () => {
    const session = [
      local('a'),
      local('phone', { isRemote: true, deviceId: 'p1' }),
      local('BOT'),
      local('b'),
      local('c'),
    ];
    expect(assignMicSlots(session, ['mic1', 'mic2']).map((p) => [p.profileId, p.deviceId])).toEqual(
      [
        ['a', 'mic1'],
        ['phone', 'p1'],
        ['BOT', ''],
        ['b', 'mic2'],
      ],
    );
  });

  it('assignMicSlots treats an empty (stale) slot as no mic', () => {
    expect(assignMicSlots([local('a'), local('b')], ['', 'mic2'])).toEqual([
      local('b', { deviceId: 'mic2' }),
    ]);
  });

  it('buildInitialConfigs skips missing profiles and adds the bot', () => {
    const configs = buildInitialConfigs(
      [local('a', { deviceId: 'mic1', volume: 0.5 }), local('ghost'), local('BOT')],
      [{ id: 'a', name: 'Anna', hue: 10 }],
    );
    expect(configs).toEqual([
      {
        id: 'a',
        name: 'Anna',
        hue: 10,
        deviceId: 'mic1',
        volume: 0.5,
        muted: false,
        latency: 0,
        isRemote: false,
        hidePitch: false,
      },
      BOT_PLAYER_CONFIG,
    ]);
  });

  it('isWantedByHost: everyone without a host list, else one id must be listed', () => {
    expect(isWantedByHost(null, ['x'])).toBe(true);
    const list = [local('a', { deviceId: 'd1' })];
    expect(isWantedByHost(list, [undefined, 'd1'])).toBe(true);
    expect(isWantedByHost(list, ['a'])).toBe(true);
    expect(isWantedByHost(list, ['z', undefined])).toBe(false);
  });
});
