import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWorkshopDetails, WorkshopError } from '../steamWorkshopApi';

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
