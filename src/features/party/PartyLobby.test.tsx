import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrCreatePlayerName } from './PartyLobby';
import { storage } from '../../lib/storage';

const STORAGE_PLAYER_NAME = 'guessart_player_name';

describe('getOrCreatePlayerName', () => {
  beforeEach(() => {
    storage.remove(STORAGE_PLAYER_NAME);
    vi.restoreAllMocks();
  });

  it('returns existing valid player name from storage (trimmed)', () => {
    storage.set(STORAGE_PLAYER_NAME, '  Alex  ');
    const name = getOrCreatePlayerName();
    expect(name).toBe('Alex');
  });

  it('generates new fun name when storage is empty', () => {
    storage.remove(STORAGE_PLAYER_NAME);
    const name = getOrCreatePlayerName();

    expect(name).toBeTruthy();
    expect(storage.get(STORAGE_PLAYER_NAME)).toBe(name);
    expect(name).toMatch(/^[A-ZÄÖÜa-zäöüß]+ \d{2}$/);
  });

  it('generates new fun name when storage is whitespace-only', () => {
    storage.set(STORAGE_PLAYER_NAME, '   ');
    const name = getOrCreatePlayerName();

    expect(name).toBeTruthy();
    expect(name.trim()).toBe(name);
    expect(storage.get(STORAGE_PLAYER_NAME)).toBe(name);
  });

  it('regenerates name if storage contains generic name "Spieler"', () => {
    storage.set(STORAGE_PLAYER_NAME, 'Spieler');
    const name = getOrCreatePlayerName();

    expect(name).not.toBe('Spieler');
    expect(storage.get(STORAGE_PLAYER_NAME)).toBe(name);
  });

  it('regenerates name if storage contains generic name "Host"', () => {
    storage.set(STORAGE_PLAYER_NAME, 'Host');
    const name = getOrCreatePlayerName();

    expect(name).not.toBe('Host');
    expect(storage.get(STORAGE_PLAYER_NAME)).toBe(name);
  });

  it('generates predictable name given specific Math.random mock', () => {
    // Math.random() = 0 -> idx = 0 ('Fuchs'), num = 10
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const name = getOrCreatePlayerName();
    expect(name).toBe('Fuchs 10');
    expect(storage.get(STORAGE_PLAYER_NAME)).toBe('Fuchs 10');
  });
});
