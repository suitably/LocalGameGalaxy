import { Hono } from 'hono';
import { serverConfig } from '../../../config';
import type { HonoEnv } from '../../../core/types';

export const tabletopWorkshopRouter = new Hono<HonoEnv>();

/** Steam API response shape for GetPublishedFileDetails */
interface SteamFileDetail {
  publishedfileid: string;
  result: number;
  creator: string;
  consumer_appid: number;
  title: string;
  description: string;
  preview_url: string;
  file_url: string;
  file_size: number;
  tags: Array<{ tag: string }>;
  time_created: number;
  time_updated: number;
  subscriptions: number;
}

interface SteamApiResponse {
  response: {
    result: number;
    resultcount: number;
    publishedfiledetails: SteamFileDetail[];
  };
}

async function fetchSteamDetails(workshopId: string): Promise<SteamFileDetail | null> {
  const form = new URLSearchParams();
  form.append('itemcount', '1');
  form.append('publishedfileids[0]', workshopId);

  const res = await fetch(
    'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    },
  );

  if (!res.ok) return null;

  const data = (await res.json()) as SteamApiResponse;
  const details = data?.response?.publishedfiledetails?.[0];
  if (!details || details.result !== 1) return null;
  return details;
}

tabletopWorkshopRouter.get('/api/tabletop/workshop/:workshopId/meta', async (c) => {
  const workshopId = c.req.param('workshopId');

  try {
    const details = await fetchSteamDetails(workshopId);
    if (!details) {
      return c.json({ error: 'Workshop item not found' }, 404);
    }

    return c.json({
      id: details.publishedfileid,
      title: details.title,
      description: details.description,
      previewUrl: details.preview_url,
      fileUrl: details.file_url || null,
      fileSize: details.file_size,
      tags: details.tags,
      creatorId: details.creator,
      timeCreated: details.time_created,
      timeUpdated: details.time_updated,
      subscriptions: details.subscriptions,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 500);
  }
});

/** Largest save file the companion passes through (Steam saves are a few MB at most). */
export const MAX_WORKSHOP_SAVE_BYTES = 50 * 1024 * 1024;

/**
 * Whether the bytes look like a TTS save: JSON (`{` after whitespace) or a BSON document, whose
 * first four bytes are its total length (little-endian) and whose last byte is 0.
 */
export function detectSaveEncoding(buffer: Buffer): 'json' | 'bson' | null {
  const first = buffer.find((b) => b !== 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d);
  if (first === 0x7b) return 'json';
  if (buffer.length >= 5 && buffer.readInt32LE(0) === buffer.length && buffer.at(-1) === 0) {
    return 'bson';
  }
  return null;
}

/**
 * Path A of the Workshop import (#702): fetches the save file and passes it through unchanged
 * (JSON or BSON). The app decodes and converts it with the same importer as after a browser
 * download, then stores the game here via `POST .../import` (`routes/workshopLibrary.ts`).
 */
tabletopWorkshopRouter.get('/api/tabletop/workshop/:workshopId', async (c) => {
  const workshopId = c.req.param('workshopId');

  let fileUrl = '';
  try {
    const details = await fetchSteamDetails(workshopId);
    if (!details || !details.file_url) {
      return c.json({ error: 'Workshop item file not found or file_url unavailable' }, 502);
    }
    fileUrl = details.file_url;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Meta check failed: ${msg}` }, 500);
  }

  try {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return c.json({ error: 'Failed to download file' }, 502);
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    if (buffer.length > MAX_WORKSHOP_SAVE_BYTES) {
      return c.json({ error: 'Workshop file is too large' }, 413);
    }
    if (!detectSaveEncoding(buffer)) {
      return c.json({ error: 'Workshop file is neither JSON nor BSON' }, 422);
    }

    return c.body(new Uint8Array(buffer), 200, {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Download failed: ${msg}` }, 500);
  }
});

/**
 * Image hosts `/tabletop/proxy-image` fetches (#693). Mirrors `PROXY_IMAGE_DOMAINS` in the web
 * app's `logic/assetCache.ts` and `cloudflare/worker.ts`; only the two Steam Akamai CDN hosts,
 * not every `*.akamaihd.net` customer.
 */
export const PROXY_IMAGE_DOMAINS = [
  'steamusercontent.com',
  'steamcommunity.com',
  'steamusercontent-a.akamaihd.net',
  'steamuserimages-a.akamaihd.net',
  'imgur.com',
];

export function isProxyImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PROXY_IMAGE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

tabletopWorkshopRouter.get('/tabletop/proxy-image', async (c) => {
  const url = c.req.query('url');

  if (!url) {
    return c.text('Missing url', 400);
  }

  // Token authentication check
  const queryToken = c.req.query('token');
  const authHeader = c.req.header('Authorization');
  const token = queryToken || (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null);

  if (serverConfig.token) {
    if (!token) {
      return c.text('Unauthorized', 401);
    }
    if (token !== serverConfig.token) {
      const isApiKey = serverConfig.apiKeys.some((k) => k.token === token);
      if (!isApiKey) {
        return c.text('Unauthorized', 401);
      }
    }
  }

  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase();

    if (!isProxyImageHost(host)) {
      return c.text('Domain not allowed', 403);
    }

    const imgRes = await fetch(url, {
      headers: {
        'User-Agent': 'LocalGameGalaxy/1.0',
      },
    });

    if (!imgRes.ok) {
      return c.text('Failed to fetch image', 502);
    }

    const contentLength = imgRes.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
      return c.text('Image too large', 413);
    }

    const contentType = imgRes.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await imgRes.arrayBuffer();

    if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
      return c.text('Image too large', 413);
    }

    c.header('Content-Type', contentType);
    c.header('Cache-Control', 'public, max-age=604800, immutable');
    c.header('Access-Control-Allow-Origin', '*');

    return c.body(new Uint8Array(arrayBuffer));
  } catch {
    return c.text('Invalid URL or fetch error', 400);
  }
});
