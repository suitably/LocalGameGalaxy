import { describe, expect, it } from 'vitest';
import { getDeviceId } from '../../lib/deviceIdentity';
import { createSeatedAssignment } from './seatedAssignment';
import { inviteSeat, joinSeatFromLink, mergeSnapshotPlayers, seatNewGame } from './seatActions';
import type { SeatedPlayer } from './playerSeats';

const T = '2026-10-22T10:00:00.000Z';
const players = (): SeatedPlayer[] => [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
];

describe('seat actions on this device', () => {
  it('joins from a link once; opening it again changes nothing', () => {
    const invited: SeatedPlayer[] = [
      { id: 'a', name: 'A', seat: { deviceId: 'dev_host', updatedAt: T } },
      { id: 'b', name: 'B', isRemote: true, seat: { deviceId: null, invitedAt: T, updatedAt: T } },
    ];
    const joined = joinSeatFromLink(invited, 'b');
    expect(joined?.[1].seat?.deviceId).toBe(getDeviceId());
    expect(joinSeatFromLink(joined!, 'b')).toBeNull();
    expect(joinSeatFromLink(invited, 'unknown')).toBeNull();
  });

  it('merges a newer snapshot fully and an older one only for seats, reporting joins', () => {
    const host: SeatedPlayer[] = [
      { id: 'a', name: 'A', seat: { deviceId: getDeviceId(), updatedAt: T } },
      { id: 'b', name: 'B', isRemote: true, seat: { deviceId: null, invitedAt: T, updatedAt: T } },
    ];
    const fromPhone = host.map((p) =>
      p.id === 'b'
        ? {
            ...p,
            name: 'Ben',
            seat: { deviceId: 'dev_phone', joinedAt: T, updatedAt: '2026-10-22T10:05:00.000Z' },
          }
        : p,
    );
    const older = mergeSnapshotPlayers(host, fromPhone, false);
    expect(older.changed).toBe(true);
    expect(older.players[1]).toMatchObject({ name: 'B', seat: { deviceId: 'dev_phone' } });
    expect(older.joined.map((p) => p.id)).toEqual(['b']);
    const newer = mergeSnapshotPlayers(host, fromPhone, true);
    expect(newer.players[1].name).toBe('Ben');
    expect(mergeSnapshotPlayers(host, host, false)).toMatchObject({ changed: false, joined: [] });
  });

  it('answers "played here?" from seats for a new game and after an invitation', () => {
    const assignment = createSeatedAssignment('test_seated_');
    const game = { id: 'g', players: seatNewGame(players()) };
    expect(assignment.localPlayerIds(game)).toEqual(['a', 'b']);
    const shared = { ...game, players: inviteSeat(game.players, 'b') };
    expect(assignment.localPlayerIds(shared)).toEqual(['a']);
    const claimed = createSeatedAssignment('test_seated_', { claimed: (_g, id) => id === 'b' });
    expect(claimed.isLocal(shared, 'b')).toBe(true);
  });
});
