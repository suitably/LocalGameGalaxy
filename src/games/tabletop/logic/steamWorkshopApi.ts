/**
 * Steam Workshop API Client [ID: GAME-TABLETOP-STEAM-API]
 *
 * Utilities for fetching Tabletop Simulator workshop mod metadata
 * from the Steam Web API. Uses ISteamRemoteStorage/GetPublishedFileDetails v1
 * which requires no API key.
 *
 * NOTE: The Steam API does NOT have CORS headers, so all requests must
 * go through the companion server proxy when called from a browser.
 */

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

/**
 * Extracts a Steam Workshop ID from various URL formats or a raw numeric ID.
 *
 * Supports:
 * - `https://steamcommunity.com/sharedfiles/filedetails/?id=2500271578`
 * - `https://steamcommunity.com/workshop/filedetails/?id=2500271578`
 * - `2500271578` (raw numeric)
 * - URLs with additional query params
 */
export function extractWorkshopId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pure numeric ID
  if (/^\d{4,20}$/.test(trimmed)) {
    return trimmed;
  }

  // URL with ?id= or &id= parameter
  const match = trimmed.match(/[?&]id=(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Validates that a string looks like a valid Steam Workshop URL or ID.
 */
export function isValidWorkshopInput(input: string): boolean {
  return extractWorkshopId(input) !== null;
}

/**
 * Fetches workshop item details via the companion server proxy.
 * The server calls Steam's API server-side (no CORS issues).
 */
export async function fetchWorkshopDetails(
  workshopId: string,
  serverBaseUrl: string,
  token?: string,
): Promise<WorkshopItemDetails> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${serverBaseUrl}/api/tabletop/workshop/${encodeURIComponent(workshopId)}/meta`,
    { headers },
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Workshop-Mod nicht gefunden oder nicht öffentlich zugänglich');
    }
    throw new Error(`Steam API Fehler: HTTP ${res.status}`);
  }

  return (await res.json()) as WorkshopItemDetails;
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
    if (res.status === 404) {
      throw new Error('Workshop-Mod nicht gefunden');
    }
    if (res.status === 502) {
      throw new Error('Download von Steam fehlgeschlagen — file_url nicht verfügbar');
    }
    throw new Error(`Server-Fehler beim Download: HTTP ${res.status}`);
  }

  return (await res.json()) as { id: string; rawJson: string; assetMap: Record<string, string> };
}
