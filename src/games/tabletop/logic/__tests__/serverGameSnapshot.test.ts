import { describe, expect, it, vi } from 'vitest';
import { blobToDataUrl, classifyAssetUrl, prepareGameForServer } from '../serverGameSnapshot';
import { isNativeGameDefinition, parseServerGame } from '../tabletopServerApi';
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

  it('sends other formats through the importer', async () => {
    const flat = JSON.stringify({ d1: { type: 'deck', cardTypes: { A: {} } } });
    expect(isNativeGameDefinition(JSON.parse(flat))).toBe(false);
    const loaded = await parseServerGame('x', flat, {});
    expect(loaded.id).not.toBe('x');
  });
});
