import { describe, expect, it } from 'vitest';
import {
  adoptLegacySeats,
  attachDeviceChannels,
  invitePlayer,
  isPlayerOnDevice,
  mergeSeatedPlayers,
  newlyJoinedPlayers,
  seatAllOnDevice,
  seatStatus,
  seatsDiffer,
  takeSeat,
  type SeatedPlayer,
} from './playerSeats';

const HOST = 'dev_host';
const PHONE = 'dev_phone';
const T0 = '2026-10-22T10:00:00.000Z';
const T1 = '2026-10-22T10:05:00.000Z';
const T2 = '2026-10-22T10:10:00.000Z';

const base: SeatedPlayer[] = [
  { id: 'a', name: 'Anna' },
  { id: 'b', name: 'Ben' },
];

describe('player seats', () => {
  it('seats every player of a new game on the creating device', () => {
    const players = seatAllOnDevice(base, HOST, T0);
    expect(players.map((p) => seatStatus(p, HOST))).toEqual(['local', 'local']);
    expect(players.every((p) => p.isRemote === false)).toBe(true);
    expect(seatStatus(players[0], PHONE)).toBe('remote');
  });

  it('turns a shared player into an open invitation, once', () => {
    const seated = seatAllOnDevice(base, HOST, T0);
    const invited = invitePlayer(seated, 'b', T1);
    expect(seatStatus(invited[1], HOST)).toBe('invited');
    expect(invited[1].isRemote).toBe(true);
    expect(isPlayerOnDevice(invited[1], HOST)).toBe(false);
    // Sharing again (copy after QR) keeps the first invitation untouched.
    expect(invitePlayer(invited, 'b', T2)[1]).toBe(invited[1]);
  });

  it('lets the invited device take the seat with its channels', () => {
    const invited = invitePlayer(seatAllOnDevice(base, HOST, T0), 'b', T1);
    const joined = takeSeat(invited, 'b', PHONE, T2, {
      remote: true,
      channels: { ntfyTopic: 'lgg-user-phone' },
    });
    expect(seatStatus(joined[1], PHONE)).toBe('local');
    expect(seatStatus(joined[1], HOST)).toBe('remote');
    expect(joined[1].seat).toMatchObject({ invitedAt: T1, joinedAt: T2 });
    expect(joined[1].ntfyTopic).toBe('lgg-user-phone');
    expect(newlyJoinedPlayers(invited, joined, HOST).map((p) => p.id)).toEqual(['b']);
    // Seeing the same state again is not a new join.
    expect(newlyJoinedPlayers(joined, joined, HOST)).toEqual([]);
  });

  it('merges by the newer seat, whichever side it comes from', () => {
    const invited = invitePlayer(seatAllOnDevice(base, HOST, T0), 'b', T1);
    const joinedOnPhone = takeSeat(invited, 'b', PHONE, T2, {
      remote: true,
      channels: { ntfyTopic: 'phone' },
    });
    // Host still has the invitation and receives the phone's newer state.
    const onHost = mergeSeatedPlayers(joinedOnPhone, invited, HOST);
    expect(onHost[1].seat?.deviceId).toBe(PHONE);
    expect(onHost[1].ntfyTopic).toBe('phone');
    // An old snapshot (e.g. the link payload opened again) does not undo the join.
    const stale = mergeSeatedPlayers(invited, joinedOnPhone, HOST);
    expect(stale[1].seat?.deviceId).toBe(PHONE);
    expect(stale[1].ntfyTopic).toBe('phone');
  });

  it('keeps own channels on a tie and takes the other device channels otherwise', () => {
    const seated = seatAllOnDevice(base, HOST, T0).map((p) => ({ ...p, ntfyTopic: 'host-topic' }));
    const incoming = seated.map((p) => ({ ...p, ntfyTopic: 'other' }));
    expect(mergeSeatedPlayers(incoming, seated, HOST)[0].ntfyTopic).toBe('host-topic');
    expect(mergeSeatedPlayers(incoming, seated, PHONE)[0].ntfyTopic).toBe('other');
  });

  it('adopts legacy local lists and falls back to them for seat-less players', () => {
    const { players, changed } = adoptLegacySeats(base, HOST, ['a'], T0);
    expect(changed).toBe(true);
    expect(seatStatus(players[0], HOST)).toBe('local');
    expect(seatStatus(players[1], HOST)).toBe('unknown');
    expect(isPlayerOnDevice(players[1], HOST, (id) => id === 'b')).toBe(true);
    expect(adoptLegacySeats(players, HOST, ['a'], T1).changed).toBe(false);
  });

  it('attaches this device channels to its own players only', () => {
    const players = invitePlayer(seatAllOnDevice(base, HOST, T0), 'b', T1);
    const result = attachDeviceChannels(players, HOST, {
      ntfyTopic: 'host',
      relayUrl: 'https://relay',
    });
    expect(result.changed).toBe(true);
    expect(result.players[0]).toMatchObject({ ntfyTopic: 'host', relayUrl: 'https://relay' });
    expect(result.players[1].ntfyTopic).toBeUndefined();
    expect(attachDeviceChannels(result.players, HOST, { ntfyTopic: 'host' }).changed).toBe(false);
    expect(seatsDiffer(players, result.players)).toBe(true);
    expect(seatsDiffer(players, players)).toBe(false);
  });
});
