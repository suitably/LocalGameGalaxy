import { afterAll, describe, expect, it, vi } from 'vitest';

// Melodiq reads `window.location` at import time; the node test environment has no window.
vi.stubGlobal('window', { location: { search: '' } });

describe('gameRegistry settings sections', { timeout: 30000 }, () => {
  afterAll(() => vi.unstubAllGlobals());

  it('uses unique section ids per game', async () => {
    const { gameRegistry } = await import('./gameRegistry');
    for (const game of gameRegistry.getGames()) {
      const ids = (game.settings?.sections ?? []).map((s) => s.id);
      expect(new Set(ids).size, game.id).toBe(ids.length);
    }
  });

  it('registers the wordle, melodiq-notes and melodiq sections', async () => {
    const { gameRegistry } = await import('./gameRegistry');
    const ids = (gameId: string) =>
      gameRegistry
        .getGames()
        .find((g) => g.id === gameId)
        ?.settings?.sections.map((s) => s.id);
    expect(ids('wordle')).toEqual(['gameplay']);
    expect(ids('melodiq-notes')).toEqual(['sounds']);
    expect(ids('melodiq')).toEqual(['profiles', 'gameplay', 'client']);
    // Importing every game takes over 5s on a busy machine
  });

  it('finds a game by whole path segments, so Melodiq Notes is not Melodiq (#620)', async () => {
    const { gameRegistry } = await import('./gameRegistry');
    const id = (path: string) => gameRegistry.findGameByPath(path)?.id;
    expect(id('/games/melodiq-notes')).toBe('melodiq-notes');
    expect(id('/games/melodiq-notes/anything')).toBe('melodiq-notes');
    expect(id('/games/melodiq')).toBe('melodiq');
    expect(id('/games/melodiq/queue')).toBe('melodiq');
    expect(id('/games/melodiq/tv')).toBe('melodiq');
    expect(id('/games/melodiqx')).toBeUndefined();
  });
});
