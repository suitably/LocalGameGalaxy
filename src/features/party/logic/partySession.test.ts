import { describe, expect, it } from 'vitest';
import { mergeIncomingState } from './partyRoster';
import {
  HOST_TIMEOUT_MS,
  HEARING_GAP_MS,
  createdState,
  hearingSince,
  joinedState,
  shouldTakeOverHost,
  takeOverHost,
} from './partySession';
import type { PartyPlayer, PartyRoomState } from './universalPartyManager';

const p = (id: string, slot: number, extra: Partial<PartyPlayer> = {}): PartyPlayer => ({
  id,
  name: id,
  avatarColor: 'red',
  isHost: id === 'h',
  score: 0,
  joinedAt: 1,
  slot,
  ...extra,
});
const room = (players: PartyPlayer[], extra: Partial<PartyRoomState> = {}): PartyRoomState => ({
  roomId: 'R',
  hostId: 'h',
  status: 'lobby',
  activeGame: null,
  players,
  updatedAt: 1,
  ...extra,
});
const NOW = 100_000;
const seen =
  (times: Record<string, number>) =>
  (id: string): number =>
    times[id] ?? 0;

describe('partySession (#467 S2)', () => {
  it('creates and joins a room', () => {
    const { state } = createdState('R', 'h', 'Hana', null, 5);
    expect(state).toMatchObject({ roomId: 'R', hostId: 'h', hostEpoch: 0, status: 'lobby' });
    expect(state.players.map((x) => x.id)).toEqual(['h']);
    const joined = joinedState('R', { myId: 'g', name: 'Gina', isRoomCreator: false }, state, 6);
    expect(joined.state.hostId).toBe('h');
    expect(joined.state.players.map((x) => x.id).sort()).toEqual(['g', 'h']);
    expect(joined.player.isHost).toBe(false);
  });

  it('the host can watch and stays host (#658)', () => {
    const { state } = createdState('R', 'h', 'Hana', null, 5);
    const watching = joinedState(
      'R',
      { myId: 'h', name: 'Hana', spectator: true, isRoomCreator: true },
      state,
      6,
    );
    expect(watching.state.hostId).toBe('h');
    expect(watching.player).toMatchObject({ isHost: true, spectator: true });
  });

  it('does not take over before the host is known', () => {
    const state = room([p('a', 0)], { hostId: '' });
    expect(shouldTakeOverHost(state, 'a', seen({}), NOW)).toBe(false);
  });

  it('keeps the host while it pings', () => {
    const state = room([p('h', 0), p('a', 1), p('b', 2)]);
    const times = { h: NOW - 1000, a: NOW, b: NOW };
    expect(shouldTakeOverHost(state, 'a', seen(times), NOW)).toBe(false);
  });

  it('the live player with the lowest seat takes over a silent host', () => {
    const state = room([p('h', 0), p('a', 2), p('b', 1)]);
    const times = { h: NOW - HOST_TIMEOUT_MS - 1, a: NOW, b: NOW };
    expect(shouldTakeOverHost(state, 'b', seen(times), NOW)).toBe(true);
    expect(shouldTakeOverHost(state, 'a', seen(times), NOW)).toBe(false);
    // b is silent too: a is next, as long as it still hears someone (c)
    const withC = room([...state.players, p('c', 3)]);
    const bGone = { ...times, b: NOW - HOST_TIMEOUT_MS - 1, c: NOW };
    expect(shouldTakeOverHost(withC, 'a', seen(bGone), NOW)).toBe(true);
  });

  it('a device that hears nobody does not take over (it is the one offline)', () => {
    // Wi-Fi to mobile data: the guest stops hearing everyone at once.
    const silent = NOW - HOST_TIMEOUT_MS - 1;
    const three = room([p('h', 0), p('a', 1), p('b', 2)]);
    expect(shouldTakeOverHost(three, 'a', seen({ h: silent, b: silent }), NOW)).toBe(false);
    // Cut off right after the host's ping and just before b's: b still looks alive when the host
    // times out, but both went quiet together, so this device is the one cut off.
    const nearly = seen({ h: NOW - HOST_TIMEOUT_MS - 50, b: NOW - HOST_TIMEOUT_MS + 200 });
    expect(shouldTakeOverHost(three, 'a', nearly, NOW)).toBe(false);
    // Host and one guest: a silent host is never replaced.
    const two = room([p('h', 0), p('a', 1)]);
    expect(shouldTakeOverHost(two, 'a', seen({ h: silent }), NOW)).toBe(false);
  });

  it('takes over at once when the host left the roster; spectators only as last resort', () => {
    const state = room([p('s', 0, { spectator: true }), p('a', 1)]);
    expect(shouldTakeOverHost(state, 'a', seen({ s: NOW, a: NOW }), NOW)).toBe(true);
    expect(shouldTakeOverHost(state, 's', seen({ s: NOW, a: NOW }), NOW)).toBe(false);
    expect(shouldTakeOverHost(room([p('s', 0, { spectator: true })]), 's', seen({}), NOW)).toBe(
      true,
    );
  });

  it('an outage of this device restarts its hearing, so it waits for the host again', () => {
    // Pings every 3 s: hearing goes on.
    expect(hearingSince(10, NOW - 3000, NOW)).toBe(10);
    // Back after 30 s without any message: hearing starts now.
    expect(hearingSince(10, NOW - 30_000, NOW)).toBe(NOW);
    expect(hearingSince(10, NOW - HEARING_GAP_MS - 1, NOW)).toBe(NOW);
    // Right after reconnecting, another guest's ping arrives before the host's: the host's
    // silence is counted from the reconnect, so there is no takeover.
    const state = room([p('h', 0), p('a', 1), p('b', 2)]);
    const since = NOW;
    const seenAt = (id: string) => Math.max({ h: NOW - 34_000, b: NOW }[id] ?? 0, since);
    expect(shouldTakeOverHost(state, 'a', seenAt, NOW + 1000)).toBe(false);
  });

  it('a takeover raises the epoch and beats the old host on merge', () => {
    const before = room([p('h', 0), p('a', 1)]);
    const after = takeOverHost(before, 'a', NOW);
    expect(after).toMatchObject({ hostId: 'a', hostEpoch: 1 });
    expect(after.players.find((x) => x.id === 'a')?.isHost).toBe(true);
    // The old host comes back still claiming the room: the higher epoch wins on its device …
    const onOldHost = mergeIncomingState(before, after, {
      myId: 'h',
      isRoomCreator: true,
      now: NOW,
    });
    expect(onOldHost.hostId).toBe('a');
    // … and its stale state does not undo the takeover on the new host.
    const onNewHost = mergeIncomingState(after, before, {
      myId: 'a',
      isRoomCreator: true,
      now: NOW,
    });
    expect(onNewHost).toMatchObject({ hostId: 'a', hostEpoch: 1 });
  });

  it('a late copy of an older state does not undo the return to the lobby', () => {
    const players = [p('h', 0), p('me', 1)];
    const back = room(players, { status: 'lobby', statusAt: 20 });
    const stale = room(players, { status: 'in_game', statusAt: 10, activeGame: 'guessart' });
    const opts = { myId: 'me', isRoomCreator: false, now: NOW };
    expect(mergeIncomingState(back, stale, opts)).toMatchObject({ status: 'lobby', statusAt: 20 });
    // A newer launch still comes through.
    const launch = { ...stale, statusAt: 30 };
    expect(mergeIncomingState(back, launch, opts)).toMatchObject({ status: 'in_game' });
  });
});
