import { describe, expect, it } from 'vitest';
import { isKeepAlivePath, keepAliveGames } from './keepAliveRoutes';

describe('keep-alive routes', () => {
  it('keeps Melodiq alive', () => {
    expect(keepAliveGames().map((g) => g.id)).toContain('melodiq');
  });

  it('matches the game page only, not its sub pages or other games', () => {
    expect(isKeepAlivePath('/games/melodiq')).toBe(true);
    expect(isKeepAlivePath('/games/melodiq/')).toBe(true);
    expect(isKeepAlivePath('/games/melodiq/queue')).toBe(false);
    expect(isKeepAlivePath('/games/melodiq/tv')).toBe(false);
    expect(isKeepAlivePath('/games/kniffel')).toBe(false);
    expect(isKeepAlivePath('/')).toBe(false);
  });
});
