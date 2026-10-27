import { describe, expect, it } from 'vitest';
import { seatedPlayers } from './partyRoster';
import type { PartyPlayer } from './universalPartyManager';

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
