import { describe, it, expect, vi } from 'vitest';
import {
  fetchAndParseGameUrl,
  fetchCatalogGame,
  fetchManifest,
} from '../gameInstaller';

describe('Tabletop gameInstaller', () => {
  it('fetches and parses a JSON game from a URL', async () => {
    const fakeGame = JSON.stringify({
      name: 'Downloaded Game',
      widgets: {
        card1: { id: 'card1', type: 'card', value: 'Ace' },
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(fakeGame),
    } as unknown as Response);

    const result = await fetchAndParseGameUrl('https://example.com/game.json', mockFetch);
    expect(result.name).toBe('Downloaded Game');
    expect(result.widgets.card1).toBeDefined();
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/game.json');
  });

  it('fetches a catalog game by relative filename', async () => {
    const fakeGame = JSON.stringify({
      name: 'Checkers Catalog',
      widgets: {},
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(fakeGame),
    } as unknown as Response);

    const result = await fetchCatalogGame('checkers.json', mockFetch);
    expect(result.name).toBe('Checkers Catalog');
    expect(mockFetch).toHaveBeenCalledWith('/games/tabletop/checkers.json');
  });

  it('fetches manifest list correctly', async () => {
    const manifest = [
      { id: 'standard-cards', name: 'Standard Kartendeck (52)', file: 'standard-cards.json' },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as unknown as Response);

    const result = await fetchManifest('/games/tabletop/manifest.json', mockFetch);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('standard-cards');
  });

  it('throws descriptive error on HTTP failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as unknown as Response);

    await expect(fetchAndParseGameUrl('https://example.com/missing.json', mockFetch)).rejects.toThrow(
      'HTTP 404: Not Found',
    );
  });
});
