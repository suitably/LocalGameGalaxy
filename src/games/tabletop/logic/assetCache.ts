/**
 * Per-device image cache for imported games — pure part [ID: LOGIC-TABLETOP-ASSET-CACHE]
 *
 * #693, TTS plan D2/D3, ADR-0005 decision 5: remote images of an imported game are copied into
 * this device's IndexedDB (`asset_cache` store, `assetCacheStore.ts`) at import and on open, so
 * a game that loaded once keeps working offline. Nothing is mirrored or uploaded: the game
 * definition keeps the remote `https://` URL, the cache only maps it to a local blob.
 *
 * Fetch order per URL (D2): browser-direct first, then the Cloudflare Worker
 * (`/api/steam/image`, allow-listed hosts), then the companion `/tabletop/proxy-image` when one
 * is configured. A URL that fails on every route is stored as failed and only retried after
 * `RETRY_FAILED_AFTER_MS` — dead hosts are reported, not retried forever.
 */
import type { AssetCacheSummary } from './importTypes';
import type { TabletopGameDefinition } from './types';

export type { AssetCacheSummary };

/**
 * Image hosts the Worker and the companion proxy for hosts without CORS. Mirrors
 * `isProxyImageHost` in `cloudflare/worker.ts` and `PROXY_IMAGE_DOMAINS` in the companion's
 * `routes/workshop.ts` (separate packages, so each keeps its copy; tests pin all three).
 */
export const PROXY_IMAGE_DOMAINS = [
  'steamusercontent.com',
  'steamcommunity.com',
  'steamusercontent-a.akamaihd.net',
  'steamuserimages-a.akamaihd.net',
  'imgur.com',
] as const;

export function isProxyImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PROXY_IMAGE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** A failed URL is tried again after a week (hosts come back, imgur purges do not). */
export const RETRY_FAILED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
/** Larger downloads are not cached (TTS sheets are ≤ 10k px; 25 MB is generous). */
export const MAX_ASSET_BYTES = 25 * 1024 * 1024;

export type CachedAsset =
  | { url: string; status: 'ok'; blob: Blob; host: string; fetchedAt: number }
  | { url: string; status: 'failed'; host: string; fetchedAt: number; reason: string };

export type FetchRoute = 'direct' | 'worker' | 'companion';

export interface FetchCandidate {
  via: FetchRoute;
  url: string;
}

export interface ProxyConfig {
  /** Use the Worker route (`/api/steam/image`); false in dev without the Worker. */
  worker: boolean;
  /** Companion base URL and token, when one is active. */
  companion?: { baseUrl: string; token?: string };
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase() || 'invalid';
  } catch {
    return 'invalid';
  }
}

const isRemote = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);

/** Collects the remote image URLs a game renders: widget/state images, faces, sheets, table. */
export function collectGameImageUrls(game: Pick<TabletopGameDefinition, 'widgets' | 'table'>) {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (isRemote(v)) urls.add(v);
  };
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const rec = value as Record<string, unknown>;
    add(rec.image);
    add(rec.previewImage);
    if (rec.type === 'image') add(rec.value);
    if (rec.spriteSheet && typeof rec.spriteSheet === 'object') {
      add((rec.spriteSheet as Record<string, unknown>).url);
    }
    for (const child of Object.values(rec)) {
      if (child && typeof child === 'object') visit(child);
    }
  };
  visit(game.widgets);
  add(game.table?.backgroundImageUrl);
  return [...urls];
}

/** Routes to try for one URL, in order (D2). */
export function fetchCandidates(url: string, proxy: ProxyConfig): FetchCandidate[] {
  const out: FetchCandidate[] = [{ via: 'direct', url }];
  if (!isProxyImageHost(hostOf(url))) return out;
  if (proxy.worker)
    out.push({ via: 'worker', url: `/api/steam/image?url=${encodeURIComponent(url)}` });
  if (proxy.companion?.baseUrl) {
    const base = proxy.companion.baseUrl.replace(/\/$/, '');
    const token = proxy.companion.token
      ? `&token=${encodeURIComponent(proxy.companion.token)}`
      : '';
    out.push({
      via: 'companion',
      url: `${base}/tabletop/proxy-image?url=${encodeURIComponent(url)}${token}`,
    });
  }
  return out;
}

/** Whether a URL must be fetched: not cached yet, or failed long enough ago. */
export function needsFetch(entry: CachedAsset | undefined, now: number): boolean {
  if (!entry) return true;
  if (entry.status === 'ok') return false;
  return now - entry.fetchedAt >= RETRY_FAILED_AFTER_MS;
}

/** A response body is cacheable if it is an image (or untyped binary) within the size limit. */
export function isCacheableImage(contentType: string, bytes: number): boolean {
  if (bytes <= 0 || bytes > MAX_ASSET_BYTES) return false;
  const type = contentType.split(';')[0].trim().toLowerCase();
  return type === '' || type.startsWith('image/') || type === 'application/octet-stream';
}

/** Counts cached and failed entries; failed ones grouped by host. */
export function summarizeAssets(entries: readonly CachedAsset[]): AssetCacheSummary {
  const deadHosts: Record<string, number> = {};
  let cached = 0;
  for (const e of entries) {
    if (e.status === 'ok') cached += 1;
    else deadHosts[e.host] = (deadHosts[e.host] ?? 0) + 1;
  }
  return { total: entries.length, cached, failed: entries.length - cached, deadHosts };
}
