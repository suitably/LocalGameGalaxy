import { describe, it, expect, vi, afterEach } from 'vitest';
import { BSON } from 'bson';
import {
  downloadWorkshopModDirect,
  fetchWorkshopDetails,
  isBlockedMixedContent,
  WorkshopError,
} from '../steamWorkshopApi';

/** The smallest save Steam could serve; the download test only needs its name. */
const sampleSave = { SaveName: 'Testspiel', ObjectStates: [] };

const respond = (body: string, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status }));

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof WorkshopError ? e.code : 'other';
  }
};

describe('steamWorkshopApi errors (#449)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports missing metadata access when no proxy exists (404 or HTML answer)', async () => {
    respond('', 404);
    expect(await codeOf(fetchWorkshopDetails('123456'))).toBe('metadata_unavailable');
    respond('<!doctype html><html></html>');
    expect(await codeOf(fetchWorkshopDetails('123456'))).toBe('metadata_unavailable');
  });

  it('reports not_found for private or missing mods and http for other failures', async () => {
    respond(JSON.stringify({ response: { publishedfiledetails: [{ result: 9 }] } }));
    expect(await codeOf(fetchWorkshopDetails('123456'))).toBe('not_found');
    respond('', 500);
    expect(await codeOf(fetchWorkshopDetails('123456'))).toBe('http');
  });
});

describe('steamWorkshopApi without a proxy (production build)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports metadata_unavailable when a static host refuses the POST or the network fails', async () => {
    respond('', 405);
    expect(await codeOf(fetchWorkshopDetails('123456'))).toBe('metadata_unavailable');
    respond('', 501);
    expect(await codeOf(fetchWorkshopDetails('123456'))).toBe('metadata_unavailable');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await codeOf(fetchWorkshopDetails('123456'))).toBe('metadata_unavailable');
  });

  it('decodes the BSON save Steam serves and rejects other files', async () => {
    const bson = new Uint8Array(BSON.serialize(sampleSave));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(bson));
    const save = await downloadWorkshopModDirect('http://cloud-3.steamusercontent.com/ugc/1/2/');
    expect(save.SaveName).toBe('Testspiel');
    expect(fetchMock).toHaveBeenCalledWith('https://steamusercontent-a.akamaihd.net/ugc/1/2/');

    respond(JSON.stringify({ hello: 'world' }));
    expect(await codeOf(downloadWorkshopModDirect('https://x.test/f'))).toBe('invalid_file');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await codeOf(downloadWorkshopModDirect('https://x.test/f'))).toBe('download_blocked');
  });
});

describe('steamWorkshopApi companion diagnostics', () => {
  afterEach(() => vi.restoreAllMocks());

  const failureOf = async (p: Promise<unknown>) => {
    try {
      await p;
      return null;
    } catch (e) {
      return e instanceof WorkshopError ? (e.companion?.reason ?? e.code) : 'other';
    }
  };

  it('knows that an HTTPS page cannot call an HTTP server except loopback', () => {
    expect(isBlockedMixedContent('http://192.168.1.20:3000', 'https:')).toBe(true);
    expect(isBlockedMixedContent('http://localhost:3000', 'https:')).toBe(false);
    expect(isBlockedMixedContent('https://my.server', 'https:')).toBe(false);
    expect(isBlockedMixedContent('http://192.168.1.20:3000', 'http:')).toBe(false);
  });

  it('says why a configured companion did not help', async () => {
    // Companion answers 401, the static host answers 405 (no proxy).
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('', { status: 405 }));
    expect(await failureOf(fetchWorkshopDetails('1', 'http://localhost:3000', 't'))).toBe(
      'unauthorized',
    );

    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(await failureOf(fetchWorkshopDetails('1', 'http://localhost:3000'))).toBe('unreachable');
  });

  it('keeps the generic hint when only the default address was tried', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    expect(
      await failureOf(fetchWorkshopDetails('1', 'http://localhost:3000', undefined, false)),
    ).toBe('metadata_unavailable');
  });
});
