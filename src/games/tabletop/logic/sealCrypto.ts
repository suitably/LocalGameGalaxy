/**
 * Per-seat encryption for private card faces [ID: LOGIC-TABLETOP-SEAL-CRYPTO]
 *
 * ECDH (P-256) between the host and each seat's device gives a shared AES-GCM key; the public
 * keys travel over the normal sync channel, the derived key never does. This keeps hands
 * private from other players listening on the channel. It does not authenticate devices: an
 * active participant could still claim a seat that is not theirs.
 */
export interface SealedBox {
  iv: string;
  data: string;
}

const ECDH: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

const fromB64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function generateSealKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH, false, ['deriveKey']);
}

export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

/** AES-GCM key shared between this device's private key and the other side's public key. */
export async function deriveSealKey(
  privateKey: CryptoKey,
  theirPublic: JsonWebKey,
): Promise<CryptoKey> {
  const pub = await crypto.subtle.importKey('jwk', theirPublic, ECDH, false, []);
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: pub },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function seal(key: CryptoKey, value: unknown): Promise<SealedBox> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return { iv: toB64(iv), data: toB64(data) };
}

export async function unseal<T>(key: CryptoKey, box: SealedBox): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(box.iv) as BufferSource },
    key,
    fromB64(box.data) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
