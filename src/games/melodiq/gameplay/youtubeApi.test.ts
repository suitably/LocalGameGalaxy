import { describe, expect, it, vi } from 'vitest';
import { disableYouTubeCaptions, type YTPlayerInstance } from './youtubeApi';

describe('disableYouTubeCaptions', () => {
  it('unloads both caption modules', () => {
    const unloadModule = vi.fn();
    const setOption = vi.fn();
    disableYouTubeCaptions({ unloadModule, setOption } as unknown as YTPlayerInstance);
    expect(unloadModule.mock.calls.map((c) => c[0])).toEqual(['captions', 'cc']);
    expect(setOption).toHaveBeenCalledWith('captions', 'track', {});
  });

  it('survives a player without the module or the methods', () => {
    const unloadModule = vi.fn(() => {
      throw new Error('no module');
    });
    expect(() =>
      disableYouTubeCaptions({ unloadModule } as unknown as YTPlayerInstance),
    ).not.toThrow();
    expect(unloadModule).toHaveBeenCalledTimes(2);
    expect(() => disableYouTubeCaptions({} as YTPlayerInstance)).not.toThrow();
    expect(() => disableYouTubeCaptions(null)).not.toThrow();
  });
});
