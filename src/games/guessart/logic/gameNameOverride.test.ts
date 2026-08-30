import { describe, it, expect, beforeEach } from 'vitest';
import { gameNameOverride } from './gameNameOverride';
import { storage } from '../../../lib/storage';

describe('gameNameOverride', () => {
  const gameId = 'test-game-123';

  beforeEach(() => {
    storage.remove(`guessart_game_alias_${gameId}`);
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
