import { describe, it, expect } from 'vitest';
import {
  decryptPayload,
  encryptPayload,
  fromBase64Url,
  generateRoomKey,
  isRoomKey,
  parseEncryptedEnvelope,
  toBase64Url,
} from './roomCrypto';

describe('roomCrypto (ADR 0009)', () => {
  it('generates 256-bit base64url keys', () => {
    const key = generateRoomKey();
    expect(isRoomKey(key)).toBe(true);
    expect(fromBase64Url(key)).toHaveLength(32);
    expect(generateRoomKey()).not.toBe(key);
    expect(isRoomKey('short')).toBe(false);
    expect(isRoomKey(null)).toBe(false);
  });

  it('round-trips base64url', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63, 1]);
    expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
  });

  it('encrypts to a versioned envelope that only the key opens', async () => {
    const key = generateRoomKey();
    const wire = await encryptPayload('{"secret":"Ünïcode roster"}', key);
    expect(wire).not.toContain('secret');
    const envelope = parseEncryptedEnvelope(wire);
    expect(envelope?.v).toBe(1);
    expect(envelope?.iv).toBeTruthy();
    expect(await decryptPayload(wire, key)).toBe('{"secret":"Ünïcode roster"}');
    expect(await decryptPayload(wire, generateRoomKey())).toBeNull();
  });

  it('uses a fresh IV per message', async () => {
    const key = generateRoomKey();
    expect(await encryptPayload('same', key)).not.toBe(await encryptPayload('same', key));
  });

  it('rejects tampered, foreign-version and plaintext messages', async () => {
    const key = generateRoomKey();
    const wire = await encryptPayload('hello', key);
    const envelope = JSON.parse(wire);
    const flipped = envelope.ct[0] === 'A' ? 'B' : 'A';
    const tampered = JSON.stringify({ ...envelope, ct: flipped + envelope.ct.slice(1) });
    expect(await decryptPayload(tampered, key)).toBeNull();
    expect(await decryptPayload(JSON.stringify({ ...envelope, v: 2 }), key)).toBeNull();
    expect(await decryptPayload('{"version":1,"payload":{}}', key)).toBeNull();
    expect(parseEncryptedEnvelope('LZ:abc')).toBeNull();
  });
});
