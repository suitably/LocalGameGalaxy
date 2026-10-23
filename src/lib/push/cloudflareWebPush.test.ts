import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  concat,
  encryptForSubscription,
  fromBase64Url,
  hkdf,
  toBase64Url,
  vapidAuthorization,
} from '../../../cloudflare/webPush';
import { handlePush, isPushServiceHost, parseSendRequest } from '../../../cloudflare/webPushSend';

const utf8 = (s: string) => new TextEncoder().encode(s);

/** A browser-side subscription: its ECDH key pair and auth secret. */
async function makeReceiver() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    pair,
    publicKey,
    auth,
    target: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: toBase64Url(publicKey), auth: toBase64Url(auth) },
    },
  };
}

/** Decrypts like the browser's push stack does (RFC 8291, receiver side). */
async function decrypt(body: Uint8Array, receiver: Awaited<ReturnType<typeof makeReceiver>>) {
  const salt = body.slice(0, 16);
  const idLength = body[20];
  const senderKey = body.slice(21, 21 + idLength);
  const ciphertext = body.slice(21 + idLength);
  const sender = await crypto.subtle.importKey(
    'raw',
    senderKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: sender }, receiver.pair.privateKey, 256),
  );
  const ikm = await hkdf(
    receiver.auth,
    shared,
    concat(utf8('WebPush: info\0'), receiver.publicKey, senderKey),
    32,
  );
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext),
  );
  expect(plain[plain.length - 1]).toBe(2);
  expect([...body.slice(16, 20)]).toEqual([0, 0, 0x10, 0]);
  return new TextDecoder().decode(plain.slice(0, -1));
}

async function makeVapid() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return {
    pair,
    keys: { publicKey: toBase64Url(raw), privateKey: jwk.d!, subject: 'https://nexumia.de' },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('web push crypto (cloudflare/webPush.ts)', () => {
  it('encrypts a payload the subscription can decrypt', async () => {
    const receiver = await makeReceiver();
    const body = await encryptForSubscription(receiver.target, '{"title":"Du bist dran"}');
    expect(await decrypt(body, receiver)).toBe('{"title":"Du bist dran"}');
  });

  it('signs a VAPID token the public key verifies, for the push service origin', async () => {
    const vapid = await makeVapid();
    const header = await vapidAuthorization('https://fcm.googleapis.com', vapid.keys);
    const [, token, key] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    expect(key).toBe(vapid.keys.publicKey);
    const [h, c, sig] = token.split('.');
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(c)));
    expect(claims).toMatchObject({ aud: 'https://fcm.googleapis.com', sub: 'https://nexumia.de' });
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      vapid.pair.publicKey,
      fromBase64Url(sig),
      utf8(`${h}.${c}`),
    );
    expect(ok).toBe(true);
  });
});

describe('web push sender (cloudflare/webPushSend.ts)', () => {
  const site = 'https://nexumia.de';
  const valid = {
    subscription: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'BPk_x', auth: 'a-b_c' },
    },
    title: 'GuessArt',
    body: 'Du bist dran!',
    url: `${site}/#/games/guessart?gameId=1`,
  };

  it('accepts only push-service endpoints', () => {
    expect(isPushServiceHost('fcm.googleapis.com')).toBe(true);
    expect(isPushServiceHost('updates.push.services.mozilla.com')).toBe(true);
    expect(isPushServiceHost('web.push.apple.com')).toBe(true);
    expect(isPushServiceHost('evil.example.com')).toBe(false);
    expect(isPushServiceHost('fcm.googleapis.com.evil.com')).toBe(false);
  });

  it('rejects other hosts, missing text and links to other sites', () => {
    expect(parseSendRequest(valid, site)).not.toBeNull();
    const at = (patch: object) => parseSendRequest({ ...valid, ...patch }, site);
    expect(
      at({ subscription: { ...valid.subscription, endpoint: 'https://evil.example.com/x' } }),
    ).toBeNull();
    expect(
      at({ subscription: { ...valid.subscription, endpoint: 'http://fcm.googleapis.com/x' } }),
    ).toBeNull();
    expect(at({ title: '' })).toBeNull();
    expect(at({ body: 'x'.repeat(301) })).toBeNull();
    expect(at({ url: 'https://phishing.example.com/' })).toBeNull();
    expect(at({ url: '/#/games/storyteller' })?.payload.url).toBe(`${site}/#/games/storyteller`);
  });

  it('is off without VAPID keys', async () => {
    const res = await handlePush(new Request(`${site}/api/push/vapid-public-key`), {});
    expect(res.status).toBe(503);
  });

  it('sends one encrypted, signed request to the push service', async () => {
    const vapid = await makeVapid();
    const receiver = await makeReceiver();
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const env = {
      VAPID_PUBLIC_KEY: vapid.keys.publicKey,
      VAPID_PRIVATE_KEY: vapid.keys.privateKey,
    };

    const key = await handlePush(new Request(`${site}/api/push/vapid-public-key`), env);
    expect(await key.json()).toEqual({ publicKey: vapid.keys.publicKey });

    const res = await handlePush(
      new Request(`${site}/api/push/send`, {
        method: 'POST',
        body: JSON.stringify({ ...valid, subscription: receiver.target }),
      }),
      env,
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(receiver.target.endpoint);
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Encoding']).toBe('aes128gcm');
    expect(headers.Authorization).toMatch(/^vapid t=/);
    const payload = JSON.parse(await decrypt(init.body as Uint8Array, receiver));
    expect(payload).toMatchObject({ title: 'GuessArt', body: 'Du bist dran!', url: valid.url });
  });

  it('reports a subscription the push service no longer knows as gone', async () => {
    const vapid = await makeVapid();
    const receiver = await makeReceiver();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 410 })),
    );
    const res = await handlePush(
      new Request(`${site}/api/push/send`, {
        method: 'POST',
        body: JSON.stringify({ ...valid, subscription: receiver.target }),
      }),
      { VAPID_PUBLIC_KEY: vapid.keys.publicKey, VAPID_PRIVATE_KEY: vapid.keys.privateKey },
    );
    expect(res.status).toBe(410);
  });

  it('passes on why the push service refused, and why signing failed', async () => {
    const vapid = await makeVapid();
    const receiver = await makeReceiver();
    const send = (env: { VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string }) =>
      handlePush(
        new Request(`${site}/api/push/send`, {
          method: 'POST',
          body: JSON.stringify({ ...valid, subscription: receiver.target }),
        }),
        env,
      );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('key does not match the subscription', { status: 403 })),
    );
    const refused = await send({
      VAPID_PUBLIC_KEY: `${vapid.keys.publicKey}\n`,
      VAPID_PRIVATE_KEY: ` ${vapid.keys.privateKey}`,
    });
    expect(refused.status).toBe(502);
    expect(await refused.json()).toEqual({
      error: 'push service refused',
      status: 403,
      detail: 'key does not match the subscription',
    });

    const broken = await send({ VAPID_PUBLIC_KEY: vapid.keys.publicKey, VAPID_PRIVATE_KEY: 'x' });
    expect(broken.status).toBe(502);
    expect(await broken.json()).toMatchObject({ error: 'push not sent' });
  });
});
