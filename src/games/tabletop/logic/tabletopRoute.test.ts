import { describe, expect, it } from 'vitest';
import {
  buildScreenRoute,
  hostSeatFromRoster,
  parseTabletopRoute,
  withHostSeat,
} from './tabletopRoute';

const parse = (q: string) => parseTabletopRoute(new URLSearchParams(q));

describe('parseTabletopRoute', () => {
  it('table-only host has no seat', () => {
    expect(parse('room=AB&role=tv')).toMatchObject({ isHost: true, seat: null, isScreen: false });
  });
  it('host with seat plays along', () => {
    expect(parse('room=AB&role=tv&seat=2')).toMatchObject({ isHost: true, seat: 2 });
  });
  it('phone controller keeps its seat', () => {
    expect(parse('room=AB&seat=1')).toMatchObject({ isHost: false, seat: 1 });
  });
  it('screen is a seatless spectator even with a seat param', () => {
    expect(parse('room=AB&role=screen&seat=1')).toMatchObject({
      isScreen: true,
      isSpectator: true,
      isHost: false,
      seat: null,
    });
  });
  it('rejects bad seats', () => {
    expect(parse('role=tv&seat=x').seat).toBeNull();
    expect(parse('role=tv&seat=-1').seat).toBeNull();
  });
});

describe('screen route and seat helpers', () => {
  it('builds the screen route', () => {
    expect(buildScreenRoute('AB', 'dice')).toBe('/games/tabletop?room=AB&gameId=dice&role=screen');
  });
  it('sets and removes the seat', () => {
    const p = new URLSearchParams('room=AB&role=tv');
    expect(withHostSeat(p, 1)).toBe('room=AB&role=tv&seat=1');
    expect(withHostSeat(new URLSearchParams('room=AB&role=tv&seat=1'), null)).toBe(
      'room=AB&role=tv',
    );
  });
  it('finds the host slot', () => {
    expect(hostSeatFromRoster([{ id: 'a', slot: 3 }], 'a')).toBe(3);
    expect(hostSeatFromRoster([{ id: 'a', spectator: true }], 'a')).toBe(0);
    expect(hostSeatFromRoster(null, 'a')).toBe(0);
  });
});
