import { describe, it, expect } from 'vitest';
import {
  PLAYER_COLORS,
  addPresencePlayer,
  colorForSlot,
  markHost,
  mergeIncomingState,
  mergeRoster,
  resolveHostId,
  upsertHost,
  upsertJoiningPlayer,
} from './partyRoster';
import type { PartyPlayer, PartyRoomState } from './universalPartyManager';

const player = (id: string, fields: Partial<PartyPlayer> = {}): PartyPlayer => ({
  id,
  name: id,
  avatarColor: '#000',
  isHost: false,
  score: 0,
  joinedAt: 1,
  ...fields,
});

const room = (fields: Partial<PartyRoomState> = {}): PartyRoomState => ({
  roomId: 'ABC',
  hostId: '',
  status: 'lobby',
  activeGame: null,
  players: [],
  updatedAt: 1,
  ...fields,
});

describe('partyRoster (#415)', () => {
  describe('resolveHostId', () => {
    it('the room creator on this device is always host', () => {
      expect(
        resolveHostId({ isRoomCreator: true, myId: 'me', incoming: room({ hostId: 'other' }) }),
      ).toBe('me');
    });

    it('prefers incoming hostId, then ours, then isHost flags', () => {
      const incoming = room({ hostId: '', players: [player('a', { isHost: true })] });
      const current = room({ hostId: 'h', players: [player('b', { isHost: true })] });
      expect(
        resolveHostId({
          isRoomCreator: false,
          myId: 'me',
          incoming: room({ hostId: 'x' }),
          current,
        }),
      ).toBe('x');
      expect(resolveHostId({ isRoomCreator: false, myId: 'me', incoming, current })).toBe('h');
      expect(resolveHostId({ isRoomCreator: false, myId: 'me', incoming, current: room() })).toBe(
        'a',
      );
      expect(
        resolveHostId({
          isRoomCreator: false,
          myId: 'me',
          incoming: room(),
          current: room({ players: [player('b', { isHost: true })] }),
        }),
      ).toBe('b');
      expect(resolveHostId({ isRoomCreator: false, myId: 'me', incoming: room() })).toBe('');
    });
  });

  it('markHost sets the resolved host and keeps flags only when no host is known', () => {
    const players = [player('a', { isHost: true }), player('b')];
    expect(markHost(players, 'b').map((p) => p.isHost)).toEqual([false, true]);
    expect(markHost(players, '').map((p) => p.isHost)).toEqual([true, false]);
  });

  it('mergeRoster keeps local-only players and never lowers a score', () => {
    const merged = mergeRoster(
      [player('a', { score: 5 }), player('local')],
      [player('a', { score: 3, name: 'A renamed' }), player('new', { score: 2 })],
    );
    expect(merged.map((p) => [p.id, p.name, p.score])).toEqual([
      ['a', 'A renamed', 5],
      ['local', 'local', 0],
      ['new', 'new', 2],
    ]);
  });

  describe('mergeIncomingState', () => {
    it('joiner without local state takes the incoming roster and host', () => {
      const incoming = room({ hostId: 'h', players: [player('h'), player('me')], updatedAt: 7 });
      const state = mergeIncomingState(null, incoming, {
        myId: 'me',
        isRoomCreator: false,
        now: 99,
      });
      expect(state.hostId).toBe('h');
      expect(state.players.find((p) => p.id === 'h')?.isHost).toBe(true);
      expect(state.updatedAt).toBe(7);
    });

    it('a reloaded host stays host even if a stale state names someone else', () => {
      const current = room({ hostId: 'me', players: [player('me', { isHost: true })] });
      const incoming = room({
        hostId: 'p1',
        players: [player('me'), player('p1', { isHost: true })],
      });
      const state = mergeIncomingState(current, incoming, {
        myId: 'me',
        isRoomCreator: true,
        now: 99,
      });
      expect(state.hostId).toBe('me');
      expect(state.players.filter((p) => p.isHost).map((p) => p.id)).toEqual(['me']);
      expect(state.updatedAt).toBe(99);
    });

    it('merges rosters and scores when we already know the room', () => {
      const current = room({ hostId: 'h', players: [player('h'), player('a', { score: 4 })] });
      const incoming = room({
        hostId: 'h',
        players: [player('h'), player('a', { score: 1 }), player('b')],
      });
      const state = mergeIncomingState(current, incoming, {
        myId: 'a',
        isRoomCreator: false,
        now: 5,
      });
      expect(state.players.map((p) => [p.id, p.score])).toEqual([
        ['h', 0],
        ['a', 4],
        ['b', 0],
      ]);
    });
  });

  it('addPresencePlayer adds a new player once, with a unique name', () => {
    const state = room({ players: [player('a', { name: 'Anna' })] });
    const updated = addPresencePlayer(state, player('b', { name: 'anna' }), 9);
    expect(updated?.players.map((p) => p.name)).toEqual(['Anna', 'anna (2)']);
    expect(updated?.updatedAt).toBe(9);
    expect(addPresencePlayer(state, player('a'), 9)).toBeNull();
  });

  it('upsertHost puts a new host first and renames a returning one', () => {
    const fresh = upsertHost([player('a')], { hostId: 'h', name: 'Tom', now: 3 });
    expect(fresh.players.map((p) => p.id)).toEqual(['h', 'a']);
    expect(fresh.host).toMatchObject({
      id: 'h',
      name: 'Tom',
      isHost: true,
      avatarColor: PLAYER_COLORS[0],
    });

    const back = upsertHost([player('a'), player('h', { score: 7 })], {
      hostId: 'h',
      name: 'Tom',
      now: 3,
    });
    expect(back.players.map((p) => [p.id, p.name, p.isHost, p.score])).toEqual([
      ['a', 'a', false, 0],
      ['h', 'Tom', true, 7],
    ]);
  });

  it('upsertJoiningPlayer keeps slot colour and score of a returning player', () => {
    const players = [player('h'), player('me', { score: 6 })];
    const back = upsertJoiningPlayer(players, {
      playerId: 'me',
      name: 'Me',
      isHost: false,
      now: 2,
    });
    expect(back.player).toMatchObject({ name: 'Me', score: 6, avatarColor: colorForSlot(1) });

    const fresh = upsertJoiningPlayer(players, {
      playerId: 'new',
      name: '',
      isHost: false,
      now: 2,
    });
    expect(fresh.players).toHaveLength(3);
    expect(fresh.player).toMatchObject({ name: 'Spieler', score: 0, avatarColor: colorForSlot(2) });
  });
});
