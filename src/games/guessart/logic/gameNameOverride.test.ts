import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { gameNameOverride } from './gameNameOverride';
import { storage } from '../../../lib/storage';

describe('gameNameOverride', () => {
  const gameId = 'test-game-123';

  beforeEach(() => {
    storage.remove(`guessart_game_alias_${gameId}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAlias', () => {
    it('returns null when gameId is empty or falsy', () => {
      expect(gameNameOverride.getAlias('')).toBeNull();
    });

    it('returns null when no local alias is set in storage', () => {
      expect(gameNameOverride.getAlias(gameId)).toBeNull();
    });

    it('returns trimmed stored value when alias exists in storage', () => {
      storage.set(`guessart_game_alias_${gameId}`, '  Stored Alias  ');
      expect(gameNameOverride.getAlias(gameId)).toBe('Stored Alias');
    });

    it('returns null when stored value is empty or contains only whitespace', () => {
      storage.set(`guessart_game_alias_${gameId}`, '   ');
      expect(gameNameOverride.getAlias(gameId)).toBeNull();
    });
  });

  describe('setAlias', () => {
    it('calls storage.set with correct key and trimmed alias when valid alias is provided', () => {
      const setSpy = vi.spyOn(storage, 'set');
      const removeSpy = vi.spyOn(storage, 'remove');

      gameNameOverride.setAlias(gameId, '  Custom Game Name  ');

      expect(setSpy).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith(`guessart_game_alias_${gameId}`, 'Custom Game Name');
      expect(removeSpy).not.toHaveBeenCalled();
      expect(gameNameOverride.getAlias(gameId)).toBe('Custom Game Name');
    });

    it('calls removeAlias (storage.remove) and NOT storage.set when alias is empty or whitespace-only', () => {
      // First set a valid alias
      gameNameOverride.setAlias(gameId, 'Initial Alias');

      const setSpy = vi.spyOn(storage, 'set');
      const removeSpy = vi.spyOn(storage, 'remove');

      gameNameOverride.setAlias(gameId, '   ');

      expect(setSpy).not.toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith(`guessart_game_alias_${gameId}`);
      expect(gameNameOverride.getAlias(gameId)).toBeNull();
    });

    it('does nothing if gameId is empty or falsy', () => {
      const setSpy = vi.spyOn(storage, 'set');
      const removeSpy = vi.spyOn(storage, 'remove');

      gameNameOverride.setAlias('', 'Valid Alias');

      expect(setSpy).not.toHaveBeenCalled();
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe('removeAlias', () => {
    it('calls storage.remove with correct key when valid gameId is provided', () => {
      const removeSpy = vi.spyOn(storage, 'remove');

      gameNameOverride.removeAlias(gameId);

      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith(`guessart_game_alias_${gameId}`);
    });

    it('does nothing if gameId is empty or falsy', () => {
      const removeSpy = vi.spyOn(storage, 'remove');

      gameNameOverride.removeAlias('');

      expect(removeSpy).not.toHaveBeenCalled();
    });

    it('removes local alias and causes getEffectiveGameName to fall back to global name', () => {
      gameNameOverride.setAlias(gameId, 'Local Title');
      expect(gameNameOverride.getAlias(gameId)).toBe('Local Title');

      gameNameOverride.removeAlias(gameId);
      expect(gameNameOverride.getAlias(gameId)).toBeNull();
      expect(gameNameOverride.getEffectiveGameName(gameId, 'Global Title')).toBe('Global Title');
    });
  });

  describe('getEffectiveGameName', () => {
    it('returns globalName when gameId is null, undefined, or empty', () => {
      expect(gameNameOverride.getEffectiveGameName(null, 'Global Title')).toBe('Global Title');
      expect(gameNameOverride.getEffectiveGameName(undefined, 'Global Title')).toBe('Global Title');
      expect(gameNameOverride.getEffectiveGameName('', 'Global Title')).toBe('Global Title');
    });

    it('returns globalName when no local alias is set', () => {
      expect(gameNameOverride.getAlias(gameId)).toBeNull();
      expect(gameNameOverride.getEffectiveGameName(gameId, 'Global Title')).toBe('Global Title');
    });

    it('returns alias when alias is set, overriding globalName', () => {
      gameNameOverride.setAlias(gameId, 'Local Title');
      expect(gameNameOverride.getEffectiveGameName(gameId, 'Global Title')).toBe('Local Title');
    });

    it('returns undefined when no alias is set and globalName is undefined', () => {
      expect(gameNameOverride.getEffectiveGameName(gameId, undefined)).toBeUndefined();
    });
  });
});
