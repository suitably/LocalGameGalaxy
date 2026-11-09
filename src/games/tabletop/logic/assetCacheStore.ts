/**
 * IndexedDB access for the per-device image cache [ID: GAME-TABLETOP-ASSET-CACHE-STORE]
 *
 * Store `asset_cache` in `galaxy_tabletop_db` (v6), keyed by the remote URL. Entries are shared
 * by every game on this device that uses the URL and never leave the device (ADR-0005 decision 5).
 */
import { requestToPromise, runWithStore } from '../../../modules/async-game/idbHelper';
import type { CachedAsset } from './assetCache';
import type { AssetStore } from './assetPrefetch';
import { openTabletopDb, STORE_ASSET_CACHE } from './tabletopStorage';

export async function getCachedAsset(url: string): Promise<CachedAsset | undefined> {
  return runWithStore(openTabletopDb, STORE_ASSET_CACHE, 'readonly', (store) =>
    requestToPromise<CachedAsset | undefined>(store.get(url)),
  );
}

export async function putCachedAsset(entry: CachedAsset): Promise<void> {
  await runWithStore(openTabletopDb, STORE_ASSET_CACHE, 'readwrite', (store) => {
    store.put(entry);
  });
}

/** Cached blobs for the given URLs (failed and missing ones are left out). */
export async function getCachedBlobs(urls: readonly string[]): Promise<Map<string, Blob>> {
  return runWithStore(openTabletopDb, STORE_ASSET_CACHE, 'readonly', async (store) => {
    const entries = await Promise.all(
      urls.map((u) => requestToPromise<CachedAsset | undefined>(store.get(u))),
    );
    const out = new Map<string, Blob>();
    for (const e of entries) if (e?.status === 'ok') out.set(e.url, e.blob);
    return out;
  });
}

export const idbAssetStore: AssetStore = { get: getCachedAsset, put: putCachedAsset };
