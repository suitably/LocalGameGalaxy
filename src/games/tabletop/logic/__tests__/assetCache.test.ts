import { describe, expect, it, vi } from 'vitest';
import {
  collectGameImageUrls,
  fetchCandidates,
  isCacheableImage,
  isProxyImageHost,
  needsFetch,
  PROXY_IMAGE_DOMAINS,
  RETRY_FAILED_AFTER_MS,
  type CachedAsset,
} from '../assetCache';
import { cacheAssets, type AssetStore } from '../assetPrefetch';
import { isProxyImageHost as workerAllows } from '../../../../../cloudflare/worker';
import type { TabletopGameDefinition } from '../types';

describe('image host allow-list', () => {
  it('allows Steam CDN and imgur hosts, not every akamaihd.net customer', () => {
    expect(isProxyImageHost('i.imgur.com')).toBe(true);
    expect(isProxyImageHost('cloud-3.steamusercontent.com')).toBe(true);
    expect(isProxyImageHost('steamuserimages-a.akamaihd.net')).toBe(true);
    expect(isProxyImageHost('evil.akamaihd.net')).toBe(false);
    expect(isProxyImageHost('imgur.com.evil.example')).toBe(false);
  });

  it('matches the Worker allow-list host for host', () => {
    const hosts = [...PROXY_IMAGE_DOMAINS, 'i.imgur.com', 'x.akamaihd.net', 'example.com'];
    for (const h of hosts) expect(workerAllows(h)).toBe(isProxyImageHost(h));
  });
});

describe('fetchCandidates (D2: direct, Worker, companion)', () => {
  it('tries direct, then Worker, then companion with token for allow-listed hosts', () => {
    const url = 'https://i.imgur.com/a.png';
    const c = fetchCandidates(url, {
      worker: true,
      companion: { baseUrl: 'http://pc:3000/', token: 't k' },
    });
    expect(c.map((x) => x.via)).toEqual(['direct', 'worker', 'companion']);
    expect(c[0].url).toBe(url);
    expect(c[1].url).toBe(`/api/steam/image?url=${encodeURIComponent(url)}`);
    expect(c[2].url).toBe(
      `http://pc:3000/tabletop/proxy-image?url=${encodeURIComponent(url)}&token=t%20k`,
    );
  });

  it('never proxies hosts outside the allow-list', () => {
    const c = fetchCandidates('https://example.com/a.png', {
      worker: true,
      companion: { baseUrl: 'http://pc:3000' },
    });
    expect(c.map((x) => x.via)).toEqual(['direct']);
  });
});

describe('cache rules', () => {
  const failed = (fetchedAt: number): CachedAsset => ({
    url: 'u',
    status: 'failed',
    host: 'h',
    fetchedAt,
    reason: 'x',
  });

  it('retries failed URLs only after the retry window', () => {
    expect(needsFetch(undefined, 0)).toBe(true);
    expect(needsFetch(failed(1000), 1000 + RETRY_FAILED_AFTER_MS - 1)).toBe(false);
    expect(needsFetch(failed(1000), 1000 + RETRY_FAILED_AFTER_MS)).toBe(true);
    const ok: CachedAsset = {
      url: 'u',
      status: 'ok',
      blob: new Blob(['x']),
      host: 'h',
      fetchedAt: 0,
    };
    expect(needsFetch(ok, Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('caches images and untyped binaries only', () => {
    expect(isCacheableImage('image/png', 10)).toBe(true);
    expect(isCacheableImage('application/octet-stream', 10)).toBe(true);
    expect(isCacheableImage('text/html; charset=utf-8', 10)).toBe(false);
    expect(isCacheableImage('image/png', 0)).toBe(false);
  });
});

describe('collectGameImageUrls', () => {
  it('collects widget, state, face, sprite sheet, bag and table images once', () => {
    const game = {
      table: { width: 1, height: 1, backgroundImageUrl: 'https://h/table.png' },
      widgets: {
        t: { type: 'token', image: 'https://h/a.png', states: [{ image: 'https://h/s.png' }] },
        c: {
          type: 'card',
          frontContent: {
            type: 'image',
            value: 'https://h/sheet.png',
            spriteSheet: { url: 'https://h/sheet.png' },
          },
          backContent: { type: 'image', value: 'https://h/back.png' },
          faceObjects: [{ type: 'image', value: 'https://h/obj.png' }],
        },
        b: { type: 'bag', previewImage: 'https://h/a.png' },
        x: { type: 'token', image: 'data:image/png;base64,AA' },
        l: { type: 'label', label: 'https://h/not-an-image' },
      },
    } as unknown as TabletopGameDefinition;
    expect(collectGameImageUrls(game).sort()).toEqual(
      [
        'https://h/a.png',
        'https://h/back.png',
        'https://h/obj.png',
        'https://h/s.png',
        'https://h/sheet.png',
        'https://h/table.png',
      ].sort(),
    );
  });
});

describe('cacheAssets', () => {
  const memoryStore = (seed: CachedAsset[] = []) => {
    const map = new Map(seed.map((e) => [e.url, e]));
    const store: AssetStore = {
      get: async (u) => map.get(u),
      put: async (e) => {
        map.set(e.url, e);
      },
    };
    return { map, store };
  };
  const png = () => new Response(new Blob(['png']), { headers: { 'Content-Type': 'image/png' } });

  it('falls back to the Worker when the direct fetch fails and reports dead hosts', async () => {
    const { map, store } = memoryStore();
    const fetcher = vi.fn(async (u: string) => {
      if (u.startsWith('/api/steam/image')) return png();
      throw new TypeError('CORS');
    });
    const progress: number[] = [];
    const summary = await cacheAssets(
      ['https://i.imgur.com/a.png', 'https://dead.example/b.png', 'https://i.imgur.com/a.png'],
      {
        store,
        fetcher,
        proxy: { worker: true },
        now: () => 5,
        onProgress: (d) => progress.push(d),
      },
    );
    expect(summary).toEqual({
      total: 2,
      cached: 1,
      failed: 1,
      deadHosts: { 'dead.example': 1 },
    });
    expect(map.get('https://i.imgur.com/a.png')?.status).toBe('ok');
    expect(map.get('https://dead.example/b.png')).toMatchObject({
      status: 'failed',
      fetchedAt: 5,
      reason: 'direct: network',
    });
    expect(progress.sort()).toEqual([1, 2]);
  });

  it('does not refetch cached or recently failed URLs', async () => {
    const { store } = memoryStore([
      { url: 'https://h/ok.png', status: 'ok', blob: new Blob(['x']), host: 'h', fetchedAt: 0 },
      { url: 'https://h/bad.png', status: 'failed', host: 'h', fetchedAt: 0, reason: 'x' },
    ]);
    const fetcher = vi.fn(async () => png());
    const summary = await cacheAssets(['https://h/ok.png', 'https://h/bad.png'], {
      store,
      fetcher,
      proxy: { worker: true },
      now: () => 1,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(summary.cached).toBe(1);
    expect(summary.deadHosts).toEqual({ h: 1 });
  });

  it('rejects an SPA fallback page as an image', async () => {
    const { map, store } = memoryStore();
    const html = () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } });
    await cacheAssets(['https://i.imgur.com/a.png'], {
      store,
      fetcher: async (u) => (u.startsWith('/api') ? html() : new Response('', { status: 404 })),
      proxy: { worker: true },
    });
    expect(map.get('https://i.imgur.com/a.png')).toMatchObject({
      status: 'failed',
      reason: 'worker: not an image',
    });
  });
});
