import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameNameOverride } from './gameNameOverride';
import { storage } from '../../../lib/storage';

describe('gameNameOverride', () => {
  const gameId = 'test-game-123';

  beforeEach(() => {
    storage.remove(`guessart_game_alias_${gameId}`);
    vi.restoreAllMocks();
  });

  describe('getAlias', () => {
    it('returns null when gameId is an empty string', () => {
      const getSpy = vi.spyOn(storage, 'get');
      expect(gameNameOverride.getAlias('')).toBeNull();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('queries storage with the correct prefix key', () => {
      const getSpy = vi.spyOn(storage, 'get');
      gameNameOverride.getAlias(gameId);
      expect(getSpy).toHaveBeenCalledWith(`guessart_game_alias_${gameId}`);
    });

    it('returns null when storage value is empty or whitespace only', () => {
      storage.set(`guessart_game_alias_${gameId}`, '');
      expect(gameNameOverride.getAlias(gameId)).toBeNull();

      storage.set(`guessart_game_alias_${gameId}`, '   ');
      expect(gameNameOverride.getAlias(gameId)).toBeNull();
    });

    it('trims leading and trailing whitespace from retrieved alias', () => {
      storage.set(`guessart_game_alias_${gameId}`, '  Spaced Alias  ');
      expect(gameNameOverride.getAlias(gameId)).toBe('Spaced Alias');
    });
  });

  it('returns global name when no local alias is set', () => {
    expect(gameNameOverride.getAlias(gameId)).toBeNull();
    expect(gameNameOverride.getEffectiveGameName(gameId, 'Global Title')).toBe('Global Title');
  });

  it('sets and retrieves local alias', () => {
    gameNameOverride.setAlias(gameId, 'Local Title');
    expect(gameNameOverride.getAlias(gameId)).toBe('Local Title');
    expect(gameNameOverride.getEffectiveGameName(gameId, 'Global Title')).toBe('Local Title');
  });

  it('removes local alias and falls back to global name', () => {
    gameNameOverride.setAlias(gameId, 'Local Title');
    expect(gameNameOverride.getAlias(gameId)).toBe('Local Title');

    gameNameOverride.removeAlias(gameId);
    expect(gameNameOverride.getAlias(gameId)).toBeNull();
    expect(gameNameOverride.getEffectiveGameName(gameId, 'Global Title')).toBe('Global Title');
  });

  it('removes alias if empty string is set', () => {
    gameNameOverride.setAlias(gameId, 'Custom');
    expect(gameNameOverride.getAlias(gameId)).toBe('Custom');

    gameNameOverride.setAlias(gameId, '   ');
    expect(gameNameOverride.getAlias(gameId)).toBeNull();
    expect(gameNameOverride.getEffectiveGameName(gameId, 'Host Game')).toBe('Host Game');
  });
});
