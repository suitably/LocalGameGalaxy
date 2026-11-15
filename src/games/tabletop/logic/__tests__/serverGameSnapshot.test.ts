import { describe, expect, it, vi } from 'vitest';
import { blobToDataUrl, classifyAssetUrl, prepareGameForServer } from '../serverGameSnapshot';
import {
  isNativeGameDefinition,
  parseServerGame,
  storeWorkshopGameOnServer,
} from '../tabletopServerApi';
import type { TabletopGameDefinition } from '../types';

const BASE = 'http://192.168.1.5:3000';

const game = (widgets: Record<string, unknown>, assetFiles?: Record<string, string>) =>
  ({
    id: 'my-game',
    name: 'My Game',
    version: '1.0.0',
    minPlayers: 1,
    maxPlayers: 4,
    supportedModes: ['solo'],
    table: { width: 1600, height: 1000 },
    widgets,
    assetFiles,
  }) as unknown as TabletopGameDefinition;

describe('classifyAssetUrl', () => {
  it('inlines device-only and token URLs, unwraps the image proxy, keeps the rest', () => {
    expect(classifyAssetUrl('blob:http://x/abc', BASE)).toBe('inline');
    expect(classifyAssetUrl(`${BASE}/tabletop/media?path=%2Fa.png&token=t`, BASE)).toBe('inline');
    expect(classifyAssetUrl(`${BASE}/tabletop/proxy-image?url=x&token=t`, BASE)).toBe('unproxy');
    expect(classifyAssetUrl('https://steamusercontent.com/a.png', BASE)).toBeNull();
    expect(classifyAssetUrl('data:image/png;base64,AA==', BASE)).toBeNull();
  });
});

describe('prepareGameForServer', () => {
  it('replaces local and token URLs everywhere and fetches each image once', async () => {
    const media = `${BASE}/tabletop/media?path=%2Fcard.png&token=secret`;
    const fetchAsset = vi.fn(
      async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
    );
    const out = await prepareGameForServer(
      game(
        {
          a: { type: 'card', image: media, faces: [media, 'blob:http://x/1'] },
          b: {
            type: 'token',
            image: `${BASE}/tabletop/proxy-image?url=${encodeURIComponent('https://imgur.com/x.png')}&token=secret`,
          },
        },
        { 'card.png': media, 'logo.png': 'data:image/png;base64,AA==' },
      ),
      `${BASE}/`,
      fetchAsset,
    );
    const json = JSON.stringify(out);
    expect(json).not.toContain('secret');
    expect(json).not.toContain('blob:');
    expect(fetchAsset).toHaveBeenCalledTimes(2);
    const a = out.widgets.a as unknown as { image: string; faces: string[] };
    expect(a.image).toBe('data:image/png;base64,AQID');
    expect(a.faces[0]).toBe(a.image);
    expect((out.widgets.b as unknown as { image: string }).image).toBe('https://imgur.com/x.png');
    expect(out.assetFiles).toEqual({ 'logo.png': 'data:image/png;base64,AA==' });
  });

  it('keeps remote images of imported games remote (per-device cache, #693)', async () => {
    const fetchAsset = vi.fn(async () => new Blob(['x']));
    const remote = 'https://i.imgur.com/elfenland.png';
    const out = await prepareGameForServer(
      game({ t: { type: 'token', image: remote } }),
      BASE,
      fetchAsset,
    );
    expect(fetchAsset).not.toHaveBeenCalled();
    expect((out.widgets.t as unknown as { image: string }).image).toBe(remote);
  });

  it('marks copies of imported third-party games private to the companion (D4)', async () => {
    const fetchAsset = vi.fn(async () => new Blob(['x']));
    const imported = { ...game({}), format: 'tts-workshop' } as TabletopGameDefinition;
    expect((await prepareGameForServer(imported, BASE, fetchAsset)).companionPrivate).toBe(true);
    const own = await prepareGameForServer(game({}), BASE, fetchAsset);
    expect(own.companionPrivate).toBeUndefined();
  });

  it('reports images that cannot be loaded', async () => {
    const fetchAsset = vi.fn(async () => {
      throw new Error('gone');
    });
    await expect(
      prepareGameForServer(game({ a: { image: 'blob:x' } }), BASE, fetchAsset),
    ).rejects.toThrow('gone');
  });

  it('encodes large images in chunks', async () => {
    const big = new Blob([new Uint8Array(100_000).fill(65)], { type: 'image/webp' });
    const url = await blobToDataUrl(big);
    expect(url.startsWith('data:image/webp;base64,QUFB')).toBe(true);
  });
});

describe('parseServerGame', () => {
  it('loads games saved by the app as they are, keyed by the server id', async () => {
    const raw = JSON.stringify(game({ c1: { id: 'c1', type: 'card', x: 10, y: 20 } }));
    expect(isNativeGameDefinition(JSON.parse(raw))).toBe(true);
    const loaded = await parseServerGame('abc123', raw, {});
    expect(loaded.id).toBe('abc123');
    expect(loaded.name).toBe('My Game');
    expect(loaded.widgets.c1.x).toBe(10);
  });

  it('keeps the third-party marks of a private companion copy', async () => {
    const raw = JSON.stringify({ ...game({}), format: 'tts-workshop', companionPrivate: true });
    const loaded = await parseServerGame('p1', raw, {});
    expect(loaded.format).toBe('tts-workshop');
    expect(loaded.companionPrivate).toBe(true);
  });

  it('sends other formats through the importer', async () => {
    const flat = JSON.stringify({ d1: { type: 'deck', cardTypes: { A: {} } } });
    expect(isNativeGameDefinition(JSON.parse(flat))).toBe(false);
    const loaded = await parseServerGame('x', flat, {});
    expect(loaded.id).not.toBe('x');
  });
});

describe('storeWorkshopGameOnServer (#702)', () => {
  it('posts the private companion copy to the Workshop import route', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ id: 'srv1', name: 'My Game', private: true }));
    const imported = { ...game({}), format: 'tts-workshop' } as TabletopGameDefinition;
    const entry = await storeWorkshopGameOnServer('123', imported);
    expect(entry.id).toBe('srv1');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/tabletop\/workshop\/123\/import$/);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body)).game.companionPrivate).toBe(true);
    fetchSpy.mockRestore();
  });
});
