/**
 * Game Installer & Fetch Helpers [ID: GAME-TABLETOP-INSTALLER]
 */
import { parsePcioFile } from './pcioParser';
import type { TabletopGameDefinition } from './types';

export interface CatalogManifestItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  minPlayers: number;
  maxPlayers: number;
  supportedModes: string[];
  file: string;
}

export async function fetchAndParseGameUrl(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<TabletopGameDefinition> {
  const resp = await fetchFn(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  const contentType = resp.headers.get('content-type') || '';
  const isJson = url.toLowerCase().endsWith('.json') || contentType.includes('application/json');
  if (isJson) {
    const text = await resp.text();
    return parsePcioFile(text);
  }
  const buffer = await resp.arrayBuffer();
  return parsePcioFile(buffer);
}

export async function fetchCatalogGame(
  filePath: string,
  fetchFn: typeof fetch = fetch,
): Promise<TabletopGameDefinition> {
  const fullUrl = filePath.startsWith('http') || filePath.startsWith('/') ? filePath : `/games/tabletop/${filePath}`;
  return fetchAndParseGameUrl(fullUrl, fetchFn);
}

export async function fetchManifest(
  manifestUrl: string = '/games/tabletop/manifest.json',
  fetchFn: typeof fetch = fetch,
): Promise<CatalogManifestItem[]> {
  const res = await fetchFn(manifestUrl);
  if (!res.ok) {
    throw new Error(`Konnte Manifest nicht laden: HTTP ${res.status}`);
  }
  return (await res.json()) as CatalogManifestItem[];
}
