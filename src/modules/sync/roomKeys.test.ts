import { describe, it, expect, beforeEach } from 'vitest';
import { captureInviteKey, ensureRoomKey, getRoomKey, roomKeyParam, setRoomKey } from './roomKeys';
import { generateRoomKey } from './roomCrypto';
import { sessionStorageSafe, storage, STORAGE_PREFIXES } from '../../lib/storage';

const KEY = generateRoomKey();

describe('roomKeys (ADR 0009)', () => {
  beforeEach(() => {
    for (const id of ['ABC', 'XY', 'g1', 'NEW']) {
      sessionStorageSafe.remove(`${STORAGE_PREFIXES.ROOM_KEY}${id}`);
      storage.remove(`${STORAGE_PREFIXES.ROOM_KEY}${id}`);
    }
  });

  it('captures a party invite key from the fragment into session storage', () => {
    expect(captureInviteKey('', `#/party?room=abc&key=${KEY}`)).toBe('ABC');
    expect(sessionStorageSafe.get(`${STORAGE_PREFIXES.ROOM_KEY}ABC`)).toBe(KEY);
    expect(getRoomKey('ABC')).toBe(KEY);
  });

  it('reads a bare #key= next to a path query (clean URLs)', () => {
    expect(captureInviteKey('?room=XY', `#key=${KEY}`)).toBe('XY');
    expect(getRoomKey('XY')).toBe(KEY);
  });

  it('never takes the key from the query string (it reaches the web server)', () => {
    expect(captureInviteKey(`?room=XY&key=${KEY}`, '')).toBeNull();
    expect(getRoomKey('XY')).toBeNull();
  });

  it('stores a "play over days" game key in local storage', () => {
    expect(captureInviteKey('', `#/games/guessart?gameId=g1&player=p&key=${KEY}`)).toBe('g1');
    expect(storage.get(`${STORAGE_PREFIXES.ROOM_KEY}g1`)).toBe(KEY);
  });

  it('ignores malformed keys and links without a key (legacy rooms)', () => {
    expect(captureInviteKey('', '#/party?room=ABC&key=nope')).toBeNull();
    expect(captureInviteKey('', '#/party?room=ABC')).toBeNull();
    expect(getRoomKey('ABC')).toBeNull();
  });

  it('ensureRoomKey keeps an existing key and creates one otherwise', () => {
    setRoomKey('ABC', KEY, 'session');
    expect(ensureRoomKey('ABC', 'session')).toBe(KEY);
    const created = ensureRoomKey('NEW', 'session');
    expect(created).not.toBe(KEY);
    expect(getRoomKey('NEW')).toBe(created);
  });

  it('roomKeyParam adds the key only when there is one', () => {
    expect(roomKeyParam(KEY)).toBe(`&key=${KEY}`);
    expect(roomKeyParam(null)).toBe('');
  });
});
