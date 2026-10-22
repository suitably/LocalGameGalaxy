/**
 * Steam Workshop API Client [ID: GAME-TABLETOP-STEAM-API]
 *
 * Utilities for fetching Tabletop Simulator workshop mod metadata
 * from the Steam Web API and downloading mods directly or via companion server.
 */
import { BSON } from 'bson';
import { isTtsSaveFile, sanitizeTtsUrl } from './ttsParser';
import type { TTSSaveFile } from './ttsTypes';

export type WorkshopErrorCode =
  | 'invalid_input'
  | 'not_found'
  | 'metadata_unavailable'
  | 'http'
  | 'download_failed'
  | 'download_blocked'
  | 'invalid_file'
  | 'no_download_url';

/** Import failure with a code the UI translates (`games.tabletop.workshop.error_<code>`). */
export class WorkshopError extends Error {
  readonly code: WorkshopErrorCode;
  readonly status?: number;

  constructor(code: WorkshopErrorCode, status?: number) {
    super(status ? `${code} (HTTP ${status})` : code);
    this.name = 'WorkshopError';
    this.code = code;
    this.status = status;
  }
}

/** Parsed workshop item metadata */
export interface WorkshopItemDetails {
  id: string;
  title: string;
  description: string;
  previewUrl: string;
  fileUrl: string | null;
  fileSize: number;
  tags: string[];
  creatorId: string;
  timeCreated: number;
  timeUpdated: number;
  subscriptions: number;
  playerCounts?: number[];
}

interface SteamApiResponse {
  response?: {
    result: number;
    resultcount: number;
    publishedfiledetails?: Array<{
      publishedfileid: string;
      result: number;
      title: string;
      description: string;
      preview_url: string;
      file_url: string;
      file_size: string | number;
      tags?: Array<{ tag: string } | string>;
      creator: string;
      time_created: number;
      time_updated: number;
      subscriptions: number;
    }>;
  };
}

/**
 * Extracts a Steam Workshop ID from various URL formats or a raw numeric ID.
 */
export function extractWorkshopId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d{4,20}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/[?&]id=(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Validates that a string looks like a valid Steam Workshop URL or ID.
 */
export function isValidWorkshopInput(input: string): boolean {
  return extractWorkshopId(input) !== null;
}

/** Statuses a static host returns when the `/api/steam` dev proxy does not exist. */
const NO_PROXY_STATUSES = new Set([404, 405, 501]);

/**
 * Direct call via Vite dev proxy or local proxy endpoint.
 */
async function querySteamDirect(workshopId: string): Promise<WorkshopItemDetails> {
  const form = new URLSearchParams();
  form.append('itemcount', '1');
  form.append('publishedfileids[0]', workshopId);

  let res: Response;
  try {
    res = await fetch('/api/steam/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
  } catch {
    // Network error: no proxy reachable (offline, Capacitor app, blocked request).
    throw new WorkshopError('metadata_unavailable');
  }

  // The `/api/steam` proxy only exists in the dev server. A static host answers 404, an SPA
  // fallback with HTML, and hosts that serve files only (Cloudflare assets, GitHub Pages)
  // refuse the POST with 405 or 501.
  if (NO_PROXY_STATUSES.has(res.status)) throw new WorkshopError('metadata_unavailable');
  if (!res.ok) throw new WorkshopError('http', res.status);

  let data: SteamApiResponse;
  try {
    data = (await res.json()) as SteamApiResponse;
  } catch {
    throw new WorkshopError('metadata_unavailable');
  }
  const item = data.response?.publishedfiledetails?.[0];
  if (!item || item.result !== 1) throw new WorkshopError('not_found');

  return {
    id: item.publishedfileid,
    title: item.title,
    description: item.description,
    previewUrl: item.preview_url,
    fileUrl: item.file_url || null,
    fileSize: Number(item.file_size) || 0,
    tags: (item.tags || []).map((t) => (typeof t === 'string' ? t : t.tag)),
    creatorId: item.creator,
    timeCreated: item.time_created,
    timeUpdated: item.time_updated,
    subscriptions: item.subscriptions || 0,
  };
}

/**
 * Fetches workshop item details via companion server proxy with fallback to local proxy.
 */
export async function fetchWorkshopDetails(
  workshopId: string,
  serverBaseUrl?: string,
  token?: string,
): Promise<WorkshopItemDetails> {
  if (serverBaseUrl) {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `${serverBaseUrl}/api/tabletop/workshop/${encodeURIComponent(workshopId)}/meta`,
        { headers },
      );

      if (res.ok) {
        return (await res.json()) as WorkshopItemDetails;
      }
    } catch {
      // Fall through to direct proxy on network or CORS errors
    }
  }

  return querySteamDirect(workshopId);
}

/**
 * Triggers server-side download of a workshop mod and returns the raw game data.
 */
export async function downloadWorkshopMod(
  workshopId: string,
  serverBaseUrl: string,
  token?: string,
): Promise<{ id: string; rawJson: string; assetMap: Record<string, string> }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${serverBaseUrl}/api/tabletop/workshop/${encodeURIComponent(workshopId)}`,
    { headers },
  );

  if (!res.ok) {
    if (res.status === 404) throw new WorkshopError('not_found');
    if (res.status === 502) throw new WorkshopError('no_download_url');
    throw new WorkshopError('http', res.status);
  }

  return (await res.json()) as { id: string; rawJson: string; assetMap: Record<string, string> };
}

/**
 * Decodes raw bytes from a mod file buffer (JSON or BSON format).
 */
export function decodeModBuffer(buffer: ArrayBuffer): unknown {
  const bytes = new Uint8Array(buffer);
  let firstChar = '';
  for (let i = 0; i < Math.min(bytes.length, 100); i++) {
    const ch = String.fromCharCode(bytes[i]);
    if (!/\s/.test(ch)) {
      firstChar = ch;
      break;
    }
  }

  if (firstChar === '{' || firstChar === '[') {
    const text = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(text);
  }

  try {
    return BSON.deserialize(bytes);
  } catch {
    const text = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(text);
  }
}

/**
 * Downloads mod data directly in the browser from Steam CDN (cors-enabled) and checks that it
 * is a TTS save. Legacy `http://cloud-N.steamusercontent.com` URLs are rewritten to the HTTPS
 * CDN, which an HTTPS page may fetch (no mixed content).
 */
export async function downloadWorkshopModDirect(fileUrl: string): Promise<TTSSaveFile> {
  let res: Response;
  try {
    res = await fetch(sanitizeTtsUrl(fileUrl));
  } catch {
    // CORS refusal, mixed content or offline: the browser hides the reason.
    throw new WorkshopError('download_blocked');
  }
  if (!res.ok) {
    throw new WorkshopError('download_failed', res.status);
  }
  let decoded: unknown;
  try {
    decoded = decodeModBuffer(await res.arrayBuffer());
  } catch {
    throw new WorkshopError('invalid_file');
  }
  if (!isTtsSaveFile(decoded)) throw new WorkshopError('invalid_file');
  return decoded;
}
