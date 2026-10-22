import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { isSteamFileHost } from '../../../../../cloudflare/worker';

const assets = { fetch: vi.fn(async () => new Response('app')) };
const env = { ASSETS: assets };

afterEach(() => vi.unstubAllGlobals());

describe('Cloudflare worker (Steam Workshop proxy)', () => {
  it('forwards only the workshop id to the Steam details API', async () => {
    const fetchMock = vi.fn(async () => new Response('{"response":{}}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const body = new URLSearchParams({
      itemcount: '1',
      'publishedfileids[0]': '2500271578',
      key: 'x',
    });
    const res = await worker.fetch(
      new Request('https://nexumia.de/api/steam/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
        method: 'POST',
        body: body.toString(),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/',
    );
    expect(init.body).toBe('itemcount=1&publishedfileids%5B0%5D=2500271578');
  });

  it('rejects ids that are not numbers', async () => {
    const res = await worker.fetch(
      new Request('https://nexumia.de/api/steam/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
        method: 'POST',
        body: 'publishedfileids%5B0%5D=abc',
      }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it('downloads only from Steam user-content hosts, over https', async () => {
    const fetchMock = vi.fn(async () => new Response('data'));
    vi.stubGlobal('fetch', fetchMock);
    const ok = await worker.fetch(
      new Request(
        'https://nexumia.de/api/steam/file?url=' +
          encodeURIComponent('http://cloud-3.steamusercontent.com/ugc/1/2/'),
      ),
      env,
    );
    expect(ok.status).toBe(200);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://cloud-3.steamusercontent.com/ugc/1/2/',
    );
    const blocked = await worker.fetch(
      new Request(
        'https://nexumia.de/api/steam/file?url=' + encodeURIComponent('https://evil.example/x'),
      ),
      env,
    );
    expect(blocked.status).toBe(403);
    expect(isSteamFileHost('steamusercontent.com.evil.example')).toBe(false);
  });

  it('serves everything else from the static assets', async () => {
    const res = await worker.fetch(new Request('https://nexumia.de/games/tabletop'), env);
    expect(await res.text()).toBe('app');
  });
});
