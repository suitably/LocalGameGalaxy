import { afterAll, describe, expect, it, vi } from 'vitest';

// Melodiq reads `window.location` at import time; the node test environment has no window.
vi.stubGlobal('window', { location: { search: '' } });

describe('gameRegistry settings sections', () => {
  afterAll(() => vi.unstubAllGlobals());

  it('uses unique section ids per game', async () => {
    const { gameRegistry } = await import('./gameRegistry');
    for (const game of gameRegistry.getGames()) {
      const ids = (game.settings?.sections ?? []).map((s) => s.id);
      expect(new Set(ids).size, game.id).toBe(ids.length);
    }
  });
});
