/**
 * Cached image URLs for the open game [ID: HOOK-TABLETOP-ASSET-URLS]
 *
 * `useAssetUrls(game)` loads this device's cached copies of the game's remote images (#693) as
 * `blob:` object URLs and, when online, caches the missing ones in the background. Widgets read
 * them through `useAssetUrl(url)`, which falls back to the remote URL. The game state itself
 * never holds `blob:` URLs, so sync, saves and the companion copy keep the remote URL.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collectGameImageUrls } from '../logic/assetCache';
import { getCachedBlobs } from '../logic/assetCacheStore';
import { cacheImageUrls } from '../logic/gameAssetCache';
import type { TabletopGameDefinition } from '../logic/types';

export type AssetUrlResolver = (url: string | undefined) => string | undefined;

const identity: AssetUrlResolver = (url) => url;

export const AssetUrlContext = createContext<AssetUrlResolver>(identity);

/** The URL to render for a widget image: the cached copy if any, else the given URL. */
export function useAssetUrl(url: string | undefined): string | undefined {
  return useContext(AssetUrlContext)(url);
}

/** Resolver for the provider; recomputes the URL list only when the image set can change. */
export function useAssetUrls(game: TabletopGameDefinition | null | undefined): AssetUrlResolver {
  const [blobUrls, setBlobUrls] = useState<ReadonlyMap<string, string>>(() => new Map());
  const widgetCount = game ? Object.keys(game.widgets).length : 0;
  const urlKey = useMemo(
    () => (game ? collectGameImageUrls(game).sort().join('\n') : ''),
    // positions change on every move; the image set only with the game or its widget count
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game?.id, widgetCount, game?.table?.backgroundImageUrl],
  );

  useEffect(() => {
    const urls = urlKey ? urlKey.split('\n') : [];
    if (urls.length === 0) return undefined;
    let alive = true;
    const created: string[] = [];
    let pending: [string, Blob][] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      const batch = pending;
      pending = [];
      if (!alive || batch.length === 0) return;
      const fresh = batch.map(([u, b]) => {
        const objectUrl = URL.createObjectURL(b);
        created.push(objectUrl);
        return [u, objectUrl] as const;
      });
      setBlobUrls((prev) => new Map([...prev, ...fresh]));
    };
    // background downloads arrive one by one: one re-render per 300 ms, not per image
    const queue = (url: string, blob: Blob) => {
      pending.push([url, blob]);
      timer ??= setTimeout(flush, 300);
    };
    (async () => {
      const cached = await getCachedBlobs(urls).catch(() => new Map<string, Blob>());
      pending.push(...cached);
      flush();
      const missing = urls.filter((u) => !cached.has(u));
      if (!alive || missing.length === 0 || !navigator.onLine) return;
      await cacheImageUrls(missing, { onCached: queue }).catch(() => undefined);
    })();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      created.forEach((u) => URL.revokeObjectURL(u));
      setBlobUrls(new Map());
    };
  }, [urlKey]);

  return useMemo<AssetUrlResolver>(
    () => (url) => (url ? (blobUrls.get(url) ?? url) : url),
    [blobUrls],
  );
}

/** The resolver itself, for components that map several URLs or render conditionally. */
export function useAssetResolver(): AssetUrlResolver {
  return useContext(AssetUrlContext);
}
