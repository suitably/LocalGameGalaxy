/**
 * Self-contained copy of a game for the companion server [ID: GAME-TABLETOP-SERVER-SNAPSHOT]
 *
 * Loaded games point at images that only work on this device or carry a token: `blob:` URLs
 * from a local folder, `/tabletop/media?…&token=` from the server's asset folders and
 * `/tabletop/proxy-image?url=…&token=`. Before a save these become data URLs (or the original
 * remote URL), so the stored game.json works for every device and never contains a token.
 */
import type { TabletopGameDefinition } from './types';

export type AssetFetcher = (url: string) => Promise<Blob>;

const defaultFetcher: AssetFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bild konnte nicht geladen werden (HTTP ${res.status})`);
  return res.blob();
};

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

/** What a string value becomes on the server copy; null keeps it as it is. */
export function classifyAssetUrl(value: string, serverBase: string): 'inline' | 'unproxy' | null {
  if (value.startsWith('blob:')) return 'inline';
  if (!serverBase) return null;
  if (value.startsWith(`${serverBase}/tabletop/media?`)) return 'inline';
  if (value.startsWith(`${serverBase}/tabletop/proxy-image?`)) return 'unproxy';
  return null;
}

export async function prepareGameForServer(
  game: TabletopGameDefinition,
  serverBaseUrl: string,
  fetchAsset: AssetFetcher = defaultFetcher,
): Promise<TabletopGameDefinition> {
  const base = serverBaseUrl.replace(/\/$/, '');
  const inlined = new Map<string, Promise<string>>();

  const mapString = (value: string): string | Promise<string> => {
    const kind = classifyAssetUrl(value, base);
    if (kind === 'unproxy') return new URL(value).searchParams.get('url') ?? value;
    if (kind !== 'inline') return value;
    let pending = inlined.get(value);
    if (!pending) {
      pending = fetchAsset(value).then(blobToDataUrl);
      inlined.set(value, pending);
    }
    return pending;
  };

  const walk = async (value: unknown): Promise<unknown> => {
    if (typeof value === 'string') return mapString(value);
    if (Array.isArray(value)) return Promise.all(value.map(walk));
    if (value && typeof value === 'object') {
      const entries = await Promise.all(
        Object.entries(value).map(async ([k, v]) => [k, await walk(v)] as const),
      );
      return Object.fromEntries(entries);
    }
    return value;
  };

  // widgets already hold the resolved URLs; the lookup table only keeps embedded images
  const { assetFiles, ...rest } = game;
  const embedded = Object.fromEntries(
    Object.entries(assetFiles ?? {}).filter(([, v]) => v.startsWith('data:')),
  );
  const copy = (await walk(rest)) as TabletopGameDefinition;
  return Object.keys(embedded).length > 0 ? { ...copy, assetFiles: embedded } : copy;
}
