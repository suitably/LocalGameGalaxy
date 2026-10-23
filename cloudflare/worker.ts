/**
 * Cloudflare Worker in front of the static app [ID: CF-APP-WORKER]
 *
 * Only `/api/steam/*` and `/api/push/*` reach this code (`run_worker_first` in wrangler.jsonc);
 * every other request is served from the static assets. `/api/push/*` is the stateless Web Push
 * sender (`webPushSend.ts`). The Steam part exists because Steam's Web API sends no CORS
 * headers, so the browser cannot ask Steam for Workshop details itself:
 *
 * - POST /api/steam/ISteamRemoteStorage/GetPublishedFileDetails/v1/ → Steam Web API (same path
 *   as the Vite dev proxy), only `itemcount` + one `publishedfileids[0]`.
 * - GET /api/steam/file?url=… → a Workshop file from Steam's user-content CDN (allow-listed
 *   hosts, size-limited), for browsers that cannot fetch it directly.
 *
 * Nothing is stored. Web Push needs the secrets `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
 */
import { handlePush, type PushEnv } from './webPushSend';

interface Env extends PushEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const STEAM_DETAILS_PATH = '/api/steam/ISteamRemoteStorage/GetPublishedFileDetails/v1/';
const STEAM_DETAILS_URL =
  'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/';
const MAX_FILE_BYTES = 60 * 1024 * 1024;

/** Steam's user-content CDN hosts (Workshop save files). */
export function isSteamFileHost(hostname: string): boolean {
  return (
    hostname === 'steamusercontent-a.akamaihd.net' ||
    hostname === 'steamusercontent.com' ||
    hostname.endsWith('.steamusercontent.com')
  );
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function workshopDetails(request: Request): Promise<Response> {
  const form = new URLSearchParams(await request.text());
  const id = form.get('publishedfileids[0]') || '';
  if (!/^\d{1,20}$/.test(id)) return json(400, { error: 'invalid workshop id' });
  const body = new URLSearchParams({ itemcount: '1', 'publishedfileids[0]': id });
  const res = await fetch(STEAM_DETAILS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

async function workshopFile(url: URL): Promise<Response> {
  let target: URL;
  try {
    target = new URL(url.searchParams.get('url') || '');
  } catch {
    return json(400, { error: 'invalid url' });
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:')
    return json(400, { error: 'invalid url' });
  if (!isSteamFileHost(target.hostname)) return json(403, { error: 'host not allowed' });
  target.protocol = 'https:';
  const res = await fetch(target.toString());
  const length = Number(res.headers.get('Content-Length') || 0);
  if (length > MAX_FILE_BYTES) return json(413, { error: 'file too large' });
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/push/')) {
      try {
        return await handlePush(request, env);
      } catch {
        return json(502, { error: 'push service unreachable' });
      }
    }
    try {
      if (url.pathname === STEAM_DETAILS_PATH && request.method === 'POST')
        return await workshopDetails(request);
      if (url.pathname === '/api/steam/file' && request.method === 'GET')
        return await workshopFile(url);
    } catch {
      return json(502, { error: 'steam unreachable' });
    }
    if (url.pathname.startsWith('/api/steam/')) return json(404, { error: 'not found' });
    return env.ASSETS.fetch(request);
  },
};
