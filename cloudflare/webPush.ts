/**
 * Web Push for the app worker: VAPID signature (RFC 8292) and aes128gcm payload encryption
 * (RFC 8291) with Web Crypto only [ID: CF-WEB-PUSH]
 *
 * Same protocol as `server/cloudflare-push-relay/webpush.ts`, which is synced from an upstream
 * repository and kept as is; this copy is typed for the app's TypeScript build.
 */

type Bytes = Uint8Array<ArrayBuffer>;

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface VapidKeys {
  /** Uncompressed P-256 public key, base64url (65 bytes). */
  publicKey: string;
  /** Private scalar `d`, base64url (32 bytes). */
  privateKey: string;
  /** Contact for the push service: `mailto:` or an https URL. */
  subject: string;
}

export function toBase64Url(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Bytes {
  const padded = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

const utf8 = (s: string): Bytes => new TextEncoder().encode(s);

/** HKDF-SHA-256 (extract + expand) as one Web Crypto call. */
export async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    bytes * 8,
  );
  return new Uint8Array(bits);
}

/** `Authorization` header for the push service at `audience` (its origin). */
export async function vapidAuthorization(audience: string, vapid: VapidKeys): Promise<string> {
  const pub = fromBase64Url(vapid.publicKey);
  const signingKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(pub.slice(1, 33)),
      y: toBase64Url(pub.slice(33, 65)),
      d: vapid.privateKey,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = toBase64Url(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = toBase64Url(
    utf8(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: vapid.subject,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  // Web Crypto's ECDSA signature is already the raw r || s form that JWT expects.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    utf8(unsigned),
  );
  return `vapid t=${unsigned}.${toBase64Url(new Uint8Array(signature))}, k=${vapid.publicKey}`;
}

/** One aes128gcm record for the subscription's keys: salt, record size, sender key, ciphertext. */
export async function encryptForSubscription(target: PushTarget, payload: string): Promise<Bytes> {
  const receiverKey = fromBase64Url(target.keys.p256dh);
  const authSecret = fromBase64Url(target.keys.auth);
  const receiver = await crypto.subtle.importKey(
    'raw',
    receiverKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const sender = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
  const senderKey = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey));
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: receiver }, sender.privateKey, 256),
  );

  const ikm = await hkdf(
    authSecret,
    shared,
    concat(utf8('WebPush: info\0'), receiverKey, senderKey),
    32,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // Padding delimiter 0x02 marks the last (and only) record.
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      concat(utf8(payload), new Uint8Array([2])),
    ),
  );
  const recordSize = new Uint8Array([0, 0, 0x10, 0]); // 4096, big-endian
  return concat(salt, recordSize, new Uint8Array([senderKey.length]), senderKey, ciphertext);
}

/** Sends one encrypted notification; resolves to the push service's status and its reason. */
export async function sendWebPush(
  target: PushTarget,
  payload: string,
  vapid: VapidKeys,
): Promise<{ status: number; detail: string }> {
  const endpoint = new URL(target.endpoint);
  const res = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(endpoint.origin, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body: await encryptForSubscription(target, payload),
  });
  // Push services explain refusals in the body (e.g. FCM: "the key in the authorization
  // header does not correspond to the sender ID"); passed on for diagnosis.
  const detail = res.ok ? '' : (await res.text().catch(() => '')).slice(0, 300);
  return { status: res.status, detail };
}
