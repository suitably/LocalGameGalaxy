import { describe, it, expect } from 'vitest';
import {
  buildPartyShareUrl,
  getGameRoute,
  resolveLobbyEntry,
  resolvePendingLaunch,
  buildInviteRoute,
} from './partyRoutes';

describe('partyRoutes (#417)', () => {
  it('resolveLobbyEntry prefers the prop, then the room URL parameter, else creates', () => {
    expect(resolveLobbyEntry('ABC', new URLSearchParams('room=XYZ'))).toEqual({
      kind: 'join',
      roomId: 'ABC',
    });
    expect(resolveLobbyEntry(undefined, new URLSearchParams('room= xyz '))).toEqual({
      kind: 'join',
      roomId: 'XYZ',
    });
    expect(resolveLobbyEntry(undefined, new URLSearchParams(''))).toEqual({ kind: 'create' });
  });

  it('tabletop opens as TV for the host and as a seat for players', () => {
    const base = { gameType: 'tabletop' as const, roomId: 'R1', tabletopGameId: 'catan' };
    expect(getGameRoute({ ...base, isHost: true, seat: 0 })).toBe(
      '/games/tabletop?room=R1&gameId=catan&role=tv',
    );
    expect(getGameRoute({ ...base, isHost: false, seat: 2 })).toBe(
      '/games/tabletop?room=R1&gameId=catan&seat=2',
    );
    expect(getGameRoute({ ...base, tabletopGameId: null, isHost: false, seat: -1 })).toBe(
      '/games/tabletop?room=R1&gameId=standard-cards&seat=0',
    );
  });

  it('a spectator opens tabletop as role=spectator without a seat', () => {
    const base = { gameType: 'tabletop' as const, roomId: 'R1', tabletopGameId: 'catan', seat: 0 };
    expect(getGameRoute({ ...base, isHost: false, spectator: true })).toBe(
      '/games/tabletop?room=R1&gameId=catan&role=spectator',
    );
    expect(getGameRoute({ ...base, isHost: true, spectator: true })).toBe(
      '/games/tabletop?room=R1&gameId=catan&role=tv',
    );
  });

  it('routes gartic phone and guessart with the room', () => {
    expect(getGameRoute({ gameType: 'garticphone', roomId: 'R1', isHost: false, seat: 0 })).toBe(
      '/games/garticphone?room=R1',
    );
    expect(getGameRoute({ gameType: 'guessart', roomId: 'R1', isHost: true, seat: 0 })).toBe(
      '/games/guessart?room=R1',
    );
    expect(getGameRoute({ gameType: 'storyteller', roomId: 'R1', isHost: false, seat: 1 })).toBe(
      '/games/storyteller?room=R1',
    );
    expect(getGameRoute({ gameType: 'melodiq-notes', roomId: 'R1', isHost: true, seat: 0 })).toBe(
      '/games/melodiq-notes?room=R1',
    );
    expect(getGameRoute({ gameType: 'melodiq-notes', roomId: 'R1', isHost: false, seat: 1 })).toBe(
      '/games/melodiq-notes?pult=R1',
    );
    expect(getGameRoute({ gameType: null, roomId: 'R1', isHost: true, seat: 0 })).toBe(
      '/games/guessart',
    );
  });

  it('share URL adds the relay only when given', () => {
    const base = { origin: 'https://nexumia.de', pathname: '/', roomId: 'R1' };
    expect(buildPartyShareUrl(base)).toBe('https://nexumia.de/#/party?room=R1');
    expect(buildPartyShareUrl({ ...base, relayUrl: 'https://my.host:3000' })).toBe(
      'https://nexumia.de/#/party?room=R1&gameRelay=https%3A%2F%2Fmy.host%3A3000',
    );
  });
});

describe('resolvePendingLaunch (Spieltisch → party lobby)', () => {
  it('accepts every party game type (#647 S1)', () => {
    for (const gameType of [
      'guessart',
      'garticphone',
      'storyteller',
      'melodiq-notes',
      'knister',
    ] as const) {
      expect(resolvePendingLaunch(new URLSearchParams(`launch=${gameType}`))).toEqual({ gameType });
    }
  });

  it('rejects garbage', () => {
    for (const q of ['launch=', 'launch=GUESSART', 'launch=__proto__', 'launch=tabletop&gameId=']) {
      expect(resolvePendingLaunch(new URLSearchParams(q))).toBeNull();
    }
  });

  it('reads a tabletop game chosen before the lobby opened', () => {
    expect(
      resolvePendingLaunch(new URLSearchParams('launch=tabletop&gameId=standard-cards')),
    ).toEqual({
      gameType: 'tabletop',
      gameId: 'standard-cards',
    });
    expect(resolvePendingLaunch(new URLSearchParams('room=ABC'))).toBeNull();
    expect(resolvePendingLaunch(new URLSearchParams('launch=tabletop'))).toBeNull();
  });

  it('reads a dice game played in the room, and routes everyone to it', () => {
    expect(resolvePendingLaunch(new URLSearchParams('launch=knister'))).toEqual({
      gameType: 'knister',
    });
    expect(resolvePendingLaunch(new URLSearchParams('launch=sudoku'))).toBeNull();
    expect(getGameRoute({ gameType: 'knister', roomId: 'R1', isHost: true, seat: 0 })).toBe(
      '/games/knister?room=R1',
    );
  });
});

describe('buildInviteRoute (#647 S2)', () => {
  it('opens a new lobby with the game preselected', () => {
    expect(buildInviteRoute('guessart')).toBe('/party?launch=guessart');
    expect(buildInviteRoute('tabletop', { gameId: 'catan' })).toBe(
      '/party?launch=tabletop&gameId=catan',
    );
  });

  it('re-opens the room this device is in', () => {
    expect(buildInviteRoute('garticphone', { roomId: 'AB12' })).toBe(
      '/party?room=AB12&launch=garticphone',
    );
  });

  it('round-trips through resolvePendingLaunch', () => {
    const query = buildInviteRoute('tabletop', { gameId: 'catan', roomId: 'R' }).split('?')[1];
    expect(resolvePendingLaunch(new URLSearchParams(query))).toEqual({
      gameType: 'tabletop',
      gameId: 'catan',
    });
  });
});
