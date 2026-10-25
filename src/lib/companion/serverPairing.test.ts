import { describe, expect, it, vi } from 'vitest';
import {
  describeDevice,
  isMixedContentBlocked,
  parsePairingParams,
  redeemPairingCode,
} from './serverPairing';

describe('parsePairingParams', () => {
  it('reads server origin and code', () => {
    const params = new URLSearchParams('tab=server&pair=http%3A%2F%2Flocalhost%3A3000%2F&code=abc');
    expect(parsePairingParams(params)).toEqual({ serverUrl: 'http://localhost:3000', code: 'abc' });
  });

  it('rejects missing parts and non-http URLs', () => {
    expect(parsePairingParams(new URLSearchParams('pair=http://localhost:3000'))).toBeNull();
    expect(parsePairingParams(new URLSearchParams('code=abc'))).toBeNull();
    expect(parsePairingParams(new URLSearchParams('pair=javascript:alert(1)&code=a'))).toBeNull();
    expect(parsePairingParams(new URLSearchParams('pair=not a url&code=a'))).toBeNull();
  });
});

describe('isMixedContentBlocked', () => {
  it('blocks http LAN servers from https pages only', () => {
    expect(isMixedContentBlocked('http://192.168.1.5:3000', 'https:')).toBe(true);
    expect(isMixedContentBlocked('http://192.168.1.5:3000', 'http:')).toBe(false);
    expect(isMixedContentBlocked('http://localhost:3000', 'https:')).toBe(false);
    expect(isMixedContentBlocked('https://x.trycloudflare.com', 'https:')).toBe(false);
  });
});

describe('redeemPairingCode', () => {
  const request = { serverUrl: 'http://localhost:3000', code: 'abc' };

  it('returns the key on success and posts code and device name', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ token: 'key1' })));
    await expect(redeemPairingCode(request, 'Chrome on Linux', fetchImpl)).resolves.toEqual({
      status: 'paired',
      token: 'key1',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/api/pair',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'abc', name: 'Chrome on Linux' }),
      }),
    );
  });

  it('maps errors to statuses', async () => {
    const status = (code: number) => async () => new Response('{}', { status: code });
    expect(await redeemPairingCode(request, 'x', status(401))).toEqual({ status: 'invalid' });
    expect(await redeemPairingCode(request, 'x', status(429))).toEqual({ status: 'rate_limited' });
    expect(await redeemPairingCode(request, 'x', status(200))).toEqual({ status: 'invalid' });
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await redeemPairingCode(request, 'x', offline)).toEqual({ status: 'unreachable' });
  });
});

describe('describeDevice', () => {
  it('names browser and OS', () => {
    expect(
      describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36'),
    ).toBe('Chrome on Windows');
    expect(describeDevice('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Firefox/131.0')).toBe(
      'Firefox on Linux',
    );
    expect(describeDevice('curl/8')).toBe('Browser');
  });
});
