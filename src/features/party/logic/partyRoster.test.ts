import { describe, it, expect } from 'vitest';
import {
  PLAYER_COLORS,
  addPresencePlayer,
  assignSlots,
  colorForSlot,
  isSpectatorPlayer,
  markHost,
  mergeIncomingState,
  mergeRoster,
  removePlayer,
  resolveHostId,
  seatOf,
  upsertHost,
  upsertJoiningPlayer,
  seatedPlayers,
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

describe('party seats (slots)', () => {
  const pl = (id: string, joinedAt: number, slot?: number): PartyPlayer => ({
    id,
    name: id,
    avatarColor: '#000',
    isHost: false,
    score: 0,
    joinedAt,
    slot,
  });

  it('gives new players the lowest free slot in join order and keeps existing ones', () => {
    const slots = assignSlots([pl('late', 30), pl('host', 10, 0), pl('mid', 20)]).map((p) => [
      p.id,
      p.slot,
    ]);
    expect(slots).toEqual([
      ['late', 2],
      ['host', 0],
      ['mid', 1],
    ]);
  });

  it('fills a gap without moving anybody', () => {
    const out = assignSlots([pl('a', 1, 0), pl('c', 3, 2), pl('new', 4)]);
    expect(out.map((p) => p.slot)).toEqual([0, 2, 1]);
  });

  it('keeps a known slot when another device sends the player without one', () => {
    const merged = mergeRoster([pl('a', 1, 3)], [pl('a', 1)]);
    expect(merged[0].slot).toBe(3);
  });

  it('uses the slot as seat, independent of roster order', () => {
    const players = [pl('b', 2, 1), pl('a', 1, 0)];
    expect(seatOf(players, 'a')).toBe(0);
    expect(seatOf(players, 'b')).toBe(1);
    expect(seatOf([pl('x', 1), pl('y', 2)], 'y')).toBe(1);
  });
});

const opts = { myId: 'h', isRoomCreator: true, now: 100 };

describe('leaving, removing and renaming (#467)', () => {
  it('a newer rename wins over a stale copy, in either order', () => {
    const renamed = player('b', { name: 'Bea', updatedAt: 20 });
    const stale = player('b', { name: 'b', updatedAt: 10, slot: 1 });
    expect(mergeRoster([renamed], [stale])[0]).toMatchObject({ name: 'Bea', slot: 1 });
    expect(mergeRoster([stale], [renamed])[0]).toMatchObject({ name: 'Bea', slot: 1 });
  });

  it('a removed player is not added back by a device that still lists them', () => {
    const host = room({ players: [player('h'), player('b', { updatedAt: 5 })] });
    const afterRemove = removePlayer(host, 'b', 10);
    expect(afterRemove.players.map((p) => p.id)).toEqual(['h']);

    const staleGuest = room({ players: [player('h'), player('b', { updatedAt: 5 })], left: {} });
    const merged = mergeIncomingState(afterRemove, staleGuest, opts);
    expect(merged.players.map((p) => p.id)).toEqual(['h']);
    // …and the guest learns about the removal from the host's state.
    expect(mergeIncomingState(staleGuest, afterRemove, opts).left).toEqual({ b: 10 });
  });

  it('a late presence ping does not bring a removed player back; a new join does', () => {
    const state = removePlayer(room({ players: [player('h')] }), 'b', 10);
    expect(addPresencePlayer(state, player('b', { updatedAt: 5 }), 11)).toBeNull();
    const back = addPresencePlayer(state, player('b', { updatedAt: 12 }), 12);
    expect(back?.players.map((p) => p.id)).toEqual(['h', 'b']);
  });

  it('a presence ping carries a rename to devices that list the player', () => {
    const state = room({ players: [player('h'), player('b', { updatedAt: 5 })] });
    const updated = addPresencePlayer(state, player('b', { name: 'Bea', updatedAt: 9 }), 9);
    expect(updated?.players[1].name).toBe('Bea');
    expect(addPresencePlayer(state, player('b', { name: 'Old', updatedAt: 1 }), 9)).toBeNull();
  });

  it('a rename keeps join time and slot', () => {
    const { player: renamed } = upsertJoiningPlayer([player('b', { joinedAt: 3, slot: 2 })], {
      playerId: 'b',
      name: 'Bea',
      isHost: false,
      now: 50,
    });
    expect(renamed).toMatchObject({ name: 'Bea', joinedAt: 3, updatedAt: 50, slot: 2 });
  });
});

describe('party spectators', () => {
  it('assignSlots gives spectators no seat and keeps the seats of players dense', () => {
    const out = assignSlots([
      player('a', { joinedAt: 1 }),
      player('w', { joinedAt: 2, spectator: true }),
      player('b', { joinedAt: 3 }),
    ]);
    expect(out.map((p) => p.slot)).toEqual([0, undefined, 1]);
  });

  it('assignSlots drops the slot of a player who turned spectator', () => {
    const out = assignSlots([player('a', { slot: 0 }), player('b', { slot: 1, spectator: true })]);
    expect(out.map((p) => p.slot)).toEqual([0, undefined]);
  });

  it('a returning spectator can pick a seat again and gets a free slot', () => {
    const { player: back } = upsertJoiningPlayer(
      [player('b', { slot: undefined, spectator: true })],
      { playerId: 'b', name: 'b', isHost: false, spectator: false, now: 5 },
    );
    expect(back.spectator).toBeUndefined();
    expect(assignSlots([player('a', { slot: 0 }), back]).map((p) => p.slot)).toEqual([0, 1]);
  });

  it('a rename keeps the spectator role, an explicit choice overrides it', () => {
    const known = [player('b', { spectator: true })];
    const base = { playerId: 'b', name: 'Bea', isHost: false, now: 5 };
    expect(upsertJoiningPlayer(known, base).player.spectator).toBe(true);
    expect(
      upsertJoiningPlayer(known, { ...base, spectator: false }).player.spectator,
    ).toBeUndefined();
  });

  it('merging does not resurrect a slot for a spectator', () => {
    const seated = player('b', { slot: 2, updatedAt: 1 });
    const watching = player('b', { spectator: true, updatedAt: 9 });
    expect(mergeRoster([seated], [watching])[0]).toMatchObject({
      spectator: true,
      slot: undefined,
    });
  });

  it('a presence ping carries a role change', () => {
    const state = room({ players: [player('b', { slot: 1, updatedAt: 1 })] });
    const next = addPresencePlayer(state, player('b', { spectator: true, updatedAt: 5 }), 9);
    expect(next?.players[0]).toMatchObject({ spectator: true, slot: undefined });
  });

  it('isSpectatorPlayer reads the role of one player', () => {
    const players = [player('a'), player('b', { spectator: true })];
    expect(isSpectatorPlayer(players, 'a')).toBe(false);
    expect(isSpectatorPlayer(players, 'b')).toBe(true);
    expect(isSpectatorPlayer(players, 'x')).toBe(false);
  });
});

describe('seatedPlayers (#550)', () => {
  it('leaves spectators out of game rosters', () => {
    const players = [
      { id: 'a', name: 'A', avatarColor: '#000', isHost: true, score: 0, joinedAt: 0 },
      {
        id: 'b',
        name: 'B',
        avatarColor: '#000',
        isHost: false,
        score: 0,
        joinedAt: 0,
        spectator: true,
      },
      { id: 'c', name: 'C', avatarColor: '#000', isHost: false, score: 0, joinedAt: 0 },
    ];
    expect(seatedPlayers(players).map((p) => p.id)).toEqual(['a', 'c']);
  });
});
