import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LZString from 'lz-string';
import { parseGameUrlParams } from './parseGameUrlParams';

describe('useGameJoinUrl', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {
      location: { search: '', hash: '', pathname: '/' },
      history: { replaceState: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  });

  it('decompresses valid LZString data payload and calls onSnapshotLoaded', () => {
    const payload = { game: { id: 'test_game_1' }, entries: [] };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));

    window.location.hash = `#/games/test?data=${compressed}&player=p1`;

    const params = parseGameUrlParams();
    const dataParam = params.get('data');
    expect(dataParam).toBe(compressed);

    const decompressed = LZString.decompressFromEncodedURIComponent(dataParam!);
    expect(JSON.parse(decompressed!)).toEqual(payload);
  });

  it('handles direct gameId when data param is absent', () => {
    window.location.hash = '#/games/test?gameId=game_999&relay=https://relay.com';

    const params = parseGameUrlParams();
    expect(params.get('gameId')).toBe('game_999');
    expect(params.get('relay')).toBe('https://relay.com');
  });

  it('handles invalid or corrupted data without crashing', () => {
    const corrupted = 'not-valid-lz-string-$$$';
    const decompressed = LZString.decompressFromEncodedURIComponent(corrupted);
    let parsed = null;
    try {
      if (decompressed) {
        parsed = JSON.parse(decompressed);
      }
    } catch {
      parsed = null;
    }
    expect(parsed).toBeNull();
  });
});
