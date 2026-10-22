import { describe, it, expect, vi, afterEach } from 'vitest';
import { BSON } from 'bson';
import sampleJson from '../../tabletopsimulator/2500271578.json';
import {
  downloadWorkshopModDirect,
  fetchWorkshopDetails,
  WorkshopError,
} from '../steamWorkshopApi';

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

describe('steamWorkshopApi without a proxy (production build, workshop 2500271578)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports metadata_unavailable when a static host refuses the POST or the network fails', async () => {
    respond('', 405);
    expect(await codeOf(fetchWorkshopDetails('2500271578'))).toBe('metadata_unavailable');
    respond('', 501);
    expect(await codeOf(fetchWorkshopDetails('2500271578'))).toBe('metadata_unavailable');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await codeOf(fetchWorkshopDetails('2500271578'))).toBe('metadata_unavailable');
  });

  it('decodes the BSON save Steam serves and rejects other files', async () => {
    const bson = new Uint8Array(BSON.serialize(sampleJson));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(bson));
    const save = await downloadWorkshopModDirect('http://cloud-3.steamusercontent.com/ugc/1/2/');
    expect(save.SaveName).toBe('Rick and Morty 100 Tage');
    expect(fetchMock).toHaveBeenCalledWith('https://steamusercontent-a.akamaihd.net/ugc/1/2/');

    respond(JSON.stringify({ hello: 'world' }));
    expect(await codeOf(downloadWorkshopModDirect('https://x.test/f'))).toBe('invalid_file');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await codeOf(downloadWorkshopModDirect('https://x.test/f'))).toBe('download_blocked');
  });
});
