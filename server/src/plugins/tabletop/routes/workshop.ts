import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serverConfig } from '../../../config';
import { scanGames } from '../services/scanner';
import type { HonoEnv, TabletopRawResponse } from '../../../core/types';

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

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if JSON
    const isJson = buffer.length > 0 && buffer[0] === 0x7b; // '{'

    let rawJson = '';
    if (isJson) {
      rawJson = buffer.toString('utf-8');
    } else {
      // For now, return error if BSON
      return c.json({ error: 'BSON format not supported yet' }, 400);
    }

    const tabletopDirs = serverConfig.tabletopDirectories || [];
    if (tabletopDirs.length === 0) {
      return c.json({ error: 'No tabletop directory configured' }, 500);
    }

    const targetDir = path.join(tabletopDirs[0], 'workshop');
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${workshopId}.json`);
    await fs.promises.writeFile(filePath, rawJson, 'utf-8');

    // Trigger rescan
    scanGames();

    const id = crypto.createHash('md5').update(filePath).digest('hex').slice(0, 16);

    const response: TabletopRawResponse = {
      id,
      rawJson,
      assetMap: {},
    };

    return c.json(response);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: `Download failed: ${msg}` }, 500);
  }
});

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

    const allowedDomains = [
      'steamusercontent.com',
      'steamcommunity.com',
      'imgur.com',
      'akamaihd.net',
    ];
    const isAllowed = allowedDomains.some((d) => host === d || host.endsWith('.' + d));

    if (!isAllowed) {
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
  } catch (e: unknown) {
    return c.text('Invalid URL or fetch error', 400);
  }
});
