import { beforeEach, describe, expect, it } from 'vitest';
import { getDeviceId } from '../../../lib/deviceIdentity';
import { storage } from '../../../lib/storage';
import { playerAssignment } from './playerAssignment';
import type { PlayerIdentity } from './types';

const T = '2026-10-22T10:00:00.000Z';

describe('playerAssignment.isLocal', () => {
  beforeEach(() => {
    for (const key of storage.findKeysWithPrefix('guessart_')) storage.remove(key);
  });

  it('follows the seat, not the legacy list', () => {
    const me = getDeviceId();
    const players: PlayerIdentity[] = [
      { id: 'a', name: 'A', seat: { deviceId: me, updatedAt: T } },
      { id: 'b', name: 'B', isRemote: true, seat: { deviceId: null, invitedAt: T, updatedAt: T } },
      { id: 'c', name: 'C', isRemote: true, seat: { deviceId: 'dev_other', updatedAt: T } },
    ];
    const game = { id: 'g1', players };
    playerAssignment.setLocalPlayerIds('g1', ['b', 'c']); // stale legacy list is ignored
    expect(playerAssignment.localPlayerIds(game)).toEqual(['a']);
  });

  it('counts a temporary "play here" claim as local', () => {
    const game = {
      id: 'g2',
      players: [{ id: 'x', name: 'X', seat: { deviceId: 'dev_other', updatedAt: T } }],
    };
    expect(playerAssignment.isLocal(game, 'x')).toBe(false);
    playerAssignment.claimTurnTemporary('g2', 'x');
    expect(playerAssignment.isLocal(game, 'x')).toBe(true);
  });

  it('falls back to the legacy list for records without seats', () => {
    const game = {
      id: 'g3',
      players: [
        { id: 'p1', name: 'P1' },
        { id: 'p2', name: 'P2', isRemote: true },
      ],
    };
    expect(playerAssignment.localPlayerIds(game)).toEqual([]);
    playerAssignment.setLocalPlayerIds('g3', ['p1']);
    expect(playerAssignment.localPlayerIds(game)).toEqual(['p1']);
    expect(playerAssignment.legacyLocalIds(game)).toEqual(['p1']);
  });
});
