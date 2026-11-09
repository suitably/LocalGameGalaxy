import { describe, expect, it } from 'vitest';
import { mapTabletopStatus } from '../useTabletopCompanion';

describe('mapTabletopStatus', () => {
  it('reports the tunnel as active when the server sends a publicUrl', () => {
    expect(
      mapTabletopStatus({
        scanning: false,
        gameCount: 4,
        publicUrl: 'https://x.trycloudflare.com',
      }),
    ).toEqual({ scanning: false, gamesCount: 4, tunnelActive: true });
  });

  it('reports no tunnel for a null or missing publicUrl', () => {
    expect(mapTabletopStatus({ gameCount: 1, publicUrl: null }).tunnelActive).toBe(false);
    expect(mapTabletopStatus({ gameCount: 1 }).tunnelActive).toBe(false);
  });

  it('falls back to zero/false for an empty response', () => {
    expect(mapTabletopStatus(null)).toEqual({
      scanning: false,
      gamesCount: 0,
      tunnelActive: false,
    });
  });
});
