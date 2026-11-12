/**
 * Fills the per-device image cache for a list of URLs [ID: LOGIC-TABLETOP-ASSET-PREFETCH]
 *
 * Store and fetch are injected so the routing (direct → Worker → companion), the retry rule and
 * the summary are testable without IndexedDB or network (#693).
 */
import {
  fetchCandidates,
  hostOf,
  isCacheableImage,
  needsFetch,
  summarizeAssets,
  type AssetCacheSummary,
  type CachedAsset,
  type ProxyConfig,
} from './assetCache';

export interface AssetStore {
  get: (url: string) => Promise<CachedAsset | undefined>;
  put: (entry: CachedAsset) => Promise<void>;
}

export type AssetFetch = (url: string) => Promise<Response>;

export interface CacheAssetsOptions {
  store: AssetStore;
  proxy: ProxyConfig;
  fetcher?: AssetFetch;
  now?: () => number;
  concurrency?: number;
  /** Called after each URL with the number done so far. */
  onProgress?: (done: number, total: number) => void;
  /** Called for each newly cached blob (lets an open table show it at once). */
  onCached?: (url: string, blob: Blob) => void;
}

async function download(
  url: string,
  proxy: ProxyConfig,
  fetcher: AssetFetch,
): Promise<{ blob: Blob } | { reason: string }> {
  let reason = 'unreachable';
  for (const candidate of fetchCandidates(url, proxy)) {
    try {
      const res = await fetcher(candidate.url);
      if (!res.ok) {
        reason = `${candidate.via}: HTTP ${res.status}`;
        continue;
      }
      const blob = await res.blob();
      const type = res.headers.get('Content-Type') ?? blob.type;
      if (!isCacheableImage(type, blob.size)) {
        reason = `${candidate.via}: not an image`;
        continue;
      }
      return { blob };
    } catch {
      reason = `${candidate.via}: network`;
    }
  }
  return { reason };
}

/** Caches every URL that is not cached yet (or failed long ago); returns the summary. */
export async function cacheAssets(
  urls: readonly string[],
  opts: CacheAssetsOptions,
): Promise<AssetCacheSummary> {
  const { store, proxy, fetcher = (u) => fetch(u), now = Date.now, concurrency = 4 } = opts;
  const unique = [...new Set(urls)];
  const results: CachedAsset[] = [];
  let next = 0;
  let done = 0;

  const one = async (url: string) => {
    const existing = await store.get(url).catch(() => undefined);
    if (existing && !needsFetch(existing, now())) {
      results.push(existing);
      return;
    }
    const got = await download(url, proxy, fetcher);
    const base = { url, host: hostOf(url), fetchedAt: now() };
    const entry: CachedAsset =
      'blob' in got
        ? { ...base, status: 'ok', blob: got.blob }
        : { ...base, status: 'failed', reason: got.reason };
    await store.put(entry).catch(() => undefined);
    if (entry.status === 'ok') opts.onCached?.(url, entry.blob);
    results.push(entry);
  };

  const worker = async () => {
    while (next < unique.length) {
      const url = unique[next++];
      await one(url);
      done += 1;
      opts.onProgress?.(done, unique.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return summarizeAssets(results);
}
