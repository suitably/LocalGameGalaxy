import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { serverConfig } from '../../../config';

/**
 * Images of Workshop games stored on the companion (#702, maintainer decision 2026-11-15:
 * the companion keeps imported Workshop games for everyone who uses it, like Melodiq songs).
 *
 * One shared store keyed by image URL in `<tabletop save root>/.assets/` (the scanner skips dot
 * folders): `<sha256(url)>` holds the bytes, `<sha256(url)>.json` the URL and content type.
 * Game JSON keeps the original URLs; clients ask `/tabletop/stored-asset?url=` first.
 */
export const ASSETS_FOLDER = '.assets';
export const MAX_STORED_ASSET_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
const CONCURRENCY = 4;

const assetsRoot = (): string => path.join(serverConfig.tabletopSaveRoot, ASSETS_FOLDER);
const keyOf = (url: string): string => crypto.createHash('sha256').update(url).digest('hex');

export interface StoredAssetMeta {
  url: string;
  contentType: string;
  bytes: number;
  storedAt: number;
}

export interface AssetJobStatus {
  total: number;
  stored: number;
  failed: number;
  running: boolean;
}

/** Asset download progress per stored game id (in memory, like Melodiq's download jobs). */
export const ASSET_JOBS = new Map<string, AssetJobStatus>();

const isRemote = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);

/**
 * Remote image URLs a game renders: `image`, `previewImage`, `spriteSheet.url`, image values and
 * the table background (same fields as the app's `collectGameImageUrls`).
 */
export function collectImageUrls(game: unknown): string[] {
  const urls = new Set<string>();
  const add = (v: unknown) => {
    if (isRemote(v)) urls.add(v);
  };
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const rec = value as Record<string, unknown>;
    add(rec.image);
    add(rec.previewImage);
    add(rec.backgroundImageUrl);
    if (rec.type === 'image') add(rec.value);
    if (rec.spriteSheet && typeof rec.spriteSheet === 'object') {
      add((rec.spriteSheet as Record<string, unknown>).url);
    }
    for (const child of Object.values(rec)) if (child && typeof child === 'object') visit(child);
  };
  const g = game as Record<string, unknown> | null;
  visit(g?.widgets);
  visit(g?.table);
  return [...urls];
}

/** Public http(s) hosts only: no loopback, private or link-local addresses (no SSRF). */
export function isPublicImageUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return false;
  }
  if (net.isIPv4(host)) {
    const [a, b] = host.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (net.isIPv6(host)) {
    return !(
      host === '::1' ||
      host === '::' ||
      /^(fc|fd|fe80)/.test(host) ||
      host.startsWith('::ffff:')
    );
  }
  return true;
}

const isImageType = (type: string): boolean => {
  const t = type.split(';')[0].trim().toLowerCase();
  return t === '' || t.startsWith('image/') || t === 'application/octet-stream';
};

export async function readStoredAsset(
  url: string,
): Promise<{ filePath: string; meta: StoredAssetMeta } | null> {
  const base = path.join(assetsRoot(), keyOf(url));
  try {
    const meta = JSON.parse(await fs.promises.readFile(`${base}.json`, 'utf-8')) as StoredAssetMeta;
    if (meta.url !== url || !fs.existsSync(base)) return null;
    return { filePath: base, meta };
  } catch {
    return null;
  }
}

/** Fetches a public URL, following up to 3 redirects that also point to public hosts. */
async function fetchPublic(url: string): Promise<Response | null> {
  let current = url;
  for (let hop = 0; hop <= 3; hop++) {
    if (!isPublicImageUrl(current)) return null;
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return res;
    current = new URL(location, current).toString();
  }
  return null;
}

/** Downloads one image into the store; true when it is stored (now or before). */
export async function storeAsset(url: string): Promise<boolean> {
  if (await readStoredAsset(url)) return true;
  try {
    const res = await fetchPublic(url);
    if (!res?.ok) return false;
    const contentType = res.headers.get('content-type') ?? '';
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (!isImageType(contentType) || declared > MAX_STORED_ASSET_BYTES) return false;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_STORED_ASSET_BYTES) return false;
    const base = path.join(assetsRoot(), keyOf(url));
    await fs.promises.mkdir(assetsRoot(), { recursive: true });
    await fs.promises.writeFile(base, bytes);
    const meta: StoredAssetMeta = {
      url,
      contentType: contentType || 'application/octet-stream',
      bytes: bytes.length,
      storedAt: Date.now(),
    };
    await fs.promises.writeFile(`${base}.json`, JSON.stringify(meta), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/** Stores every image of a game; progress is readable in `ASSET_JOBS` under `gameId`. */
export async function storeGameAssets(gameId: string, game: unknown): Promise<AssetJobStatus> {
  const queue = collectImageUrls(game);
  const status: AssetJobStatus = { total: queue.length, stored: 0, failed: 0, running: true };
  ASSET_JOBS.set(gameId, status);
  const worker = async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      if (await storeAsset(url)) status.stored += 1;
      else status.failed += 1;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  status.running = false;
  return status;
}
