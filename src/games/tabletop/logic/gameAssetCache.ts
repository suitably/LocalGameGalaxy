/**
 * Caches the images of one game on this device [ID: LOGIC-TABLETOP-GAME-ASSET-CACHE]
 *
 * Glue between `cacheAssets` (pure routing), the IndexedDB store and the companion settings;
 * used by the import (`useWorkshopImport`, with progress) and on open (`useAssetUrls`).
 */
import {
  getHelperToken,
  getHelperUrl,
  isHelperActive,
} from '../../../lib/companion/companionSettings';
import { collectGameImageUrls, type AssetCacheSummary, type ProxyConfig } from './assetCache';
import { idbAssetStore } from './assetCacheStore';
import { cacheAssets, type CacheAssetsOptions } from './assetPrefetch';
import type { TabletopGameDefinition } from './types';

/** Worker route always (it fails quietly where absent), companion only when active. */
export function currentProxyConfig(): ProxyConfig {
  return {
    worker: true,
    ...(isHelperActive()
      ? { companion: { baseUrl: getHelperUrl(), token: getHelperToken() || undefined } }
      : {}),
  };
}

type Callbacks = Pick<CacheAssetsOptions, 'onProgress' | 'onCached'>;

export function cacheImageUrls(
  urls: readonly string[],
  callbacks: Callbacks = {},
): Promise<AssetCacheSummary> {
  return cacheAssets(urls, { store: idbAssetStore, proxy: currentProxyConfig(), ...callbacks });
}

/** Import step: caches the images and records the summary in the import report. */
export async function withCachedImages(
  game: TabletopGameDefinition,
  onProgress?: (done: number, total: number) => void,
): Promise<TabletopGameDefinition> {
  const urls = collectGameImageUrls(game);
  if (urls.length === 0) return game;
  try {
    const assets = await cacheImageUrls(urls, { onProgress });
    return game.importReport ? { ...game, importReport: { ...game.importReport, assets } } : game;
  } catch {
    // no IndexedDB (private mode) → the game still imports and loads its images online
    return game;
  }
}
