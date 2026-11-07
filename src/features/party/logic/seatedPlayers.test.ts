import { describe, expect, it } from 'vitest';
import { roomPlayersOf, seatedPlayers } from './partyRoster';
import type { PartyPlayer, PartyRoomState } from './universalPartyManager';

const player = (id: string, spectator?: boolean): PartyPlayer => ({
  id,
  name: id.toUpperCase(),
  avatarColor: 'red',
  isHost: id === 'a',
  score: 0,
  joinedAt: 0,
  ...(spectator ? { spectator } : {}),
});

describe('seatedPlayers (#550)', () => {
  it('leaves spectators out of game rosters', () => {
    const players = [player('a'), player('b', true), player('c')];
    expect(seatedPlayers(players).map((p) => p.id)).toEqual(['a', 'c']);
  });
});

describe('roomPlayersOf (#647 S3)', () => {
  it('lists seated players in seat order with host flag', () => {
    const base = { joinedAt: 0, lastSeen: 0, updatedAt: 0 } as const;
    const state = {
      roomId: 'R',
      hostId: 'h',
      status: 'lobby' as const,
      activeGame: null,
      updatedAt: 0,
      players: [
        { ...base, id: 'g', name: 'Gina', slot: 1 },
        { ...base, id: 's', name: 'Sam', spectator: true },
        { ...base, id: 'h', name: 'Hana', slot: 0 },
      ],
    } as unknown as PartyRoomState;
    expect(roomPlayersOf(state)).toEqual([
      { id: 'h', name: 'Hana', seat: 0, isHost: true },
      { id: 'g', name: 'Gina', seat: 1, isHost: false },
    ]);
    expect(roomPlayersOf(null)).toEqual([]);
  });
});
