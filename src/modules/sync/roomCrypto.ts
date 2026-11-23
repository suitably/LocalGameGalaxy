/**
 * End-to-end encryption of MQTT room payloads [ID: MODULES-SYNC-ROOM-CRYPTO]
 *
 * Pure Web Crypto helpers (AES-GCM 256). The key is created by the host, travels only in the
 * invite link's `#fragment` and never reaches a broker or server (ADR 0009). Wire envelope:
 * `{"v":1,"iv":"<base64 12 bytes>","ct":"<base64 ciphertext + tag>"}`.
 */

export const ROOM_CRYPTO_VERSION = 1;

export interface EncryptedEnvelope {
  v: typeof ROOM_CRYPTO_VERSION;
  iv: string;
  ct: string;
}

const KEY_BYTES = 32;
const IV_BYTES = 12;

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const toBase64Url = (bytes: Uint8Array): string =>
  bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToBytes(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

/** True for a 256-bit key in base64url (43 characters, no padding). */
export const isRoomKey = (key: string | null | undefined): key is string =>
  typeof key === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key);

/** A fresh random room key, base64url (synchronous, so links can be built at once). */
export function generateRoomKey(): string {
  return toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(KEY_BYTES)));
}

const importedKeys = new Map<string, Promise<CryptoKey>>();

/** Imports (and caches) a base64url room key as a non-extractable AES-GCM key. */
export function importRoomKey(key: string): Promise<CryptoKey> {
  let imported = importedKeys.get(key);
  if (!imported) {
    imported = globalThis.crypto.subtle.importKey(
      'raw',
      fromBase64Url(key),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
    importedKeys.set(key, imported);
  }
  return imported;
}

/** Parses a wire string as an encrypted envelope; `null` for anything else (e.g. plaintext). */
export function parseEncryptedEnvelope(raw: string): EncryptedEnvelope | null {
  if (!raw.startsWith('{"v":')) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { v, iv, ct } = parsed as Record<string, unknown>;
    if (typeof iv !== 'string' || typeof ct !== 'string') return null;
    return typeof v === 'number' ? { v: v as typeof ROOM_CRYPTO_VERSION, iv, ct } : null;
  } catch {
    return null;
  }
}

/** Encrypts `plain` (UTF-8) with a fresh IV; returns the JSON wire envelope. */
export async function encryptPayload(plain: string, key: string): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await importRoomKey(key),
    new TextEncoder().encode(plain),
  );
  const envelope: EncryptedEnvelope = {
    v: ROOM_CRYPTO_VERSION,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ct)),
  };
  return JSON.stringify(envelope);
}

/** Decrypts a wire envelope; `null` when it is not one, has another version or fails to verify. */
export async function decryptPayload(raw: string, key: string): Promise<string | null> {
  const envelope = parseEncryptedEnvelope(raw);
  if (!envelope || envelope.v !== ROOM_CRYPTO_VERSION) return null;
  try {
    const plain = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
      await importRoomKey(key),
      base64ToBytes(envelope.ct),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
