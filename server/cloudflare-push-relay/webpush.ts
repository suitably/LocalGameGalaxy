/**
 * webpush.ts - Web Push encryption & VAPID signing for Cloudflare Workers
 *
 * Implements RFC 8291 (Message Encryption for Web Push) and RFC 8292 (VAPID)
 * using the Web Crypto API available in Cloudflare Workers runtime.
 *
 * This replaces the Node.js `web-push` library which is incompatible with Workers.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concatBuffers(...buffers: ArrayBuffer[]): Uint8Array {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result;
}

function encodeLength(value: number, size: number): Uint8Array {
  const buffer = new Uint8Array(size);
  for (let i = size - 1; i >= 0; i--) {
    buffer[i] = value & 0xff;
    value >>= 8;
  }
  return buffer;
}

/**
 * Generates an ECDSA P-256 VAPID keypair in base64url format.
 */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );
  const rawPublic = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKey = base64UrlEncode(new Uint8Array(rawPublic));

  const jwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const privateKey = jwk.d!;

  return { publicKey, privateKey };
}

// ─── VAPID JWT Signing (RFC 8292) ────────────────────────────────────────────

/**
 * Creates a VAPID Authorization header value.
 *
 * @param audience - Push service origin (e.g. "https://fcm.googleapis.com")
 * @param subject - Contact URI (e.g. "mailto:admin@example.com")
 * @param publicKeyBase64 - VAPID public key (URL-safe base64, 65 bytes uncompressed)
 * @param privateKeyBase64 - VAPID private key (URL-safe base64, 32 bytes raw)
 * @param expirationSeconds - JWT expiry from now (default 12 hours)
 */
export async function createVapidAuthHeader(
  audience: string,
  subject: string,
  publicKeyBase64: string,
  privateKeyBase64: string,
  expirationSeconds = 12 * 60 * 60,
): Promise<{ authorization: string }> {
  // Import the raw 32-byte private key for ECDSA P-256 signing
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);

  // Build JWK for the private key — P-256 requires x, y, d components
  // We need the public key to extract x,y; the private key gives us d
  const publicKeyBytes = base64UrlDecode(publicKeyBase64);

  // publicKeyBytes is 65 bytes: 0x04 || x (32) || y (32)
  const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
  const y = base64UrlEncode(publicKeyBytes.slice(33, 65));
  const d = base64UrlEncode(privateKeyBytes);

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d,
  };

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // Create JWT
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: now + expirationSeconds,
        sub: subject,
      }),
    ),
  );

  const unsignedToken = `${header}.${payload}`;
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(unsignedToken),
  );

  // Web Crypto returns the signature in DER-encoded format for ECDSA,
  // but JWT expects raw r||s format (64 bytes).
  const signature = derToRaw(new Uint8Array(signatureBuffer));
  const jwt = `${unsignedToken}.${base64UrlEncode(signature)}`;

  return {
    authorization: `vapid t=${jwt}, k=${publicKeyBase64}`,
  };
}

/**
 * Converts a DER-encoded ECDSA signature to the raw r||s format (64 bytes).
 * Web Crypto API produces DER; JWT/VAPID requires raw.
 */
function derToRaw(der: Uint8Array): Uint8Array {
  // DER structure: 0x30 <total-len> 0x02 <r-len> <r> 0x02 <s-len> <s>
  const raw = new Uint8Array(64);

  // Check if it's already raw 64 bytes (some implementations)
  if (der.length === 64) return der;

  let offset = 2; // Skip 0x30 and total length

  // Read r
  if (der[offset] !== 0x02) throw new Error('Invalid DER signature');
  offset++;
  const rLen = der[offset];
  offset++;
  const rBytes = der.slice(offset, offset + rLen);
  offset += rLen;

  // Read s
  if (der[offset] !== 0x02) throw new Error('Invalid DER signature');
  offset++;
  const sLen = der[offset];
  offset++;
  const sBytes = der.slice(offset, offset + sLen);

  // Copy r (right-aligned to 32 bytes, skip leading zeros)
  const rStart = rLen > 32 ? rLen - 32 : 0;
  const rDest = 32 - Math.min(rLen, 32);
  raw.set(rBytes.slice(rStart), rDest);

  // Copy s (right-aligned to 32 bytes, skip leading zeros)
  const sStart = sLen > 32 ? sLen - 32 : 0;
  const sDest = 32 + 32 - Math.min(sLen, 32);
  raw.set(sBytes.slice(sStart), sDest);

  return raw;
}

// ─── Web Push Payload Encryption (RFC 8291 / aes128gcm) ─────────────────────

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string; // Base64url: User agent's ECDH public key
    auth: string;   // Base64url: 16-byte authentication secret
  };
}

/**
 * Encrypts a push message payload according to RFC 8291 (aes128gcm).
 *
 * @returns The encrypted body as Uint8Array, ready to POST to the push endpoint.
 */
export async function encryptPayload(
  subscription: PushSubscription,
  payload: string,
): Promise<Uint8Array> {
  const plaintext = new TextEncoder().encode(payload);

  // 1. Decode subscriber keys
  const clientPublicKeyBytes = base64UrlDecode(subscription.keys.p256dh); // 65 bytes
  const authSecret = base64UrlDecode(subscription.keys.auth); // 16 bytes

  // Import client's public key for ECDH
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );

  // 2. Generate ephemeral server ECDH keypair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  // Export server public key (uncompressed, 65 bytes)
  const serverPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey),
  );

  // 3. ECDH key agreement → shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // 4. Generate random 16-byte salt for this message
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. HKDF Step 1: Extract PRK from auth secret + ECDH shared secret
  //    PRK = HKDF-Extract(salt=authSecret, IKM=sharedSecret)
  const prkKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits'],
  );

  // info for IKM derivation: "WebPush: info\0" || ua_public (65) || as_public (65)
  const ikmInfo = concatBuffers(
    new TextEncoder().encode('WebPush: info\0'),
    clientPublicKeyBytes,
    serverPublicKeyBytes,
  );

  // Derive IKM using auth_secret as salt
  const authHkdfKey = await crypto.subtle.importKey(
    'raw',
    authSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits'],
  );

  // Actually: IKM = HKDF(salt=authSecret, IKM=sharedSecret, info=ikmInfo, len=32)
  // We need to use the shared secret as the input and auth as salt
  // HKDF in Web Crypto: importKey the IKM, then deriveBits with salt+info
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: authSecret,
        info: ikmInfo,
      },
      prkKey,
      256,
    ),
  );

  // 6. Derive Content Encryption Key (CEK) and Nonce from salt + IKM
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits'],
  );

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
    ikmKey,
    128,
  );

  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    ikmKey,
    96,
  );

  // 7. Encrypt with AES-128-GCM
  const cek = await crypto.subtle.importKey(
    'raw',
    cekBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );

  // Pad plaintext: payload || 0x02 (last record delimiter)
  const paddedPlaintext = concatBuffers(plaintext, new Uint8Array([2]));

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonceBits, tagLength: 128 },
      cek,
      paddedPlaintext,
    ),
  );

  // 8. Build aes128gcm body:
  //    salt (16) || rs (4, big-endian uint32) || idlen (1) || keyid (65 = server public key) || encrypted
  const rs = 4096; // Record size
  const header = concatBuffers(
    salt,
    encodeLength(rs, 4),
    new Uint8Array([serverPublicKeyBytes.byteLength]),
    serverPublicKeyBytes,
  );

  return concatBuffers(header, encrypted);
}

// ─── High-Level Send Function ────────────────────────────────────────────────

export interface WebPushOptions {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

export interface WebPushResult {
  success: boolean;
  statusCode?: number;
  statusText?: string;
}

/**
 * Sends a Web Push notification to a single subscription endpoint
 * with proper VAPID authentication and RFC 8291 payload encryption.
 */
export async function sendWebPush(
  subscription: PushSubscription,
  payloadString: string,
  options: WebPushOptions,
): Promise<WebPushResult> {
  // 1. Determine audience from endpoint URL origin
  const endpointUrl = new URL(subscription.endpoint);
  const audience = endpointUrl.origin;

  // 2. Create VAPID Authorization header
  const { authorization } = await createVapidAuthHeader(
    audience,
    options.vapidSubject,
    options.vapidPublicKey,
    options.vapidPrivateKey,
  );

  // 3. Encrypt the payload
  const encryptedBody = await encryptPayload(subscription, payloadString);

  // 4. POST to push endpoint
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
    },
    body: encryptedBody,
  });

  return {
    success: response.ok || response.status === 201,
    statusCode: response.status,
    statusText: response.statusText,
  };
}
