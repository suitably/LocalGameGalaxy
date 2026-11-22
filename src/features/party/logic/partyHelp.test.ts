import { describe, expect, it } from 'vitest';
import { mayHelp, withHelp } from './partyHelp';
import type { RoomPlayer } from './partyRoster';

const players: RoomPlayer[] = [
  { id: 'a', name: 'A', seat: 0, isHost: true },
  { id: 'b', name: 'B', seat: 1, isHost: false, helpers: 'all' },
  { id: 'c', name: 'C', seat: 2, isHost: false },
];
type S = { active: string };
const onlyActive = (s: S, _a: string, from: string) => s.active === from;

describe('party help', () => {
  it('lets anyone in the room help a player who allowed it', () => {
    expect(mayHelp(players, 'a', 'b')).toBe(true);
    expect(mayHelp(players, 'c', 'b')).toBe(true);
    expect(mayHelp(players, 'b', 'c')).toBe(false);
    expect(mayHelp(players, 'b', 'b')).toBe(false);
    expect(mayHelp(players, 'x', 'b')).toBe(false);
    expect(mayHelp(players, 'a', null)).toBe(false);
  });

  it('authorizes a helper only where the helped player could act', () => {
    const authorize = withHelp(onlyActive, () => players);
    expect(authorize({ active: 'b' }, 'roll', 'a')).toBe(true);
    expect(authorize({ active: 'c' }, 'roll', 'a')).toBe(false);
    expect(authorize({ active: 'a' }, 'roll', 'a')).toBe(true);
  });
});
