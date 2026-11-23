/**
 * Key exchange for data only one device may read [ID: MODULE-ROOM-SEAL-CHANNEL]
 *
 * Host: derives one key per seat from that device's public key and seals values for it.
 * Seat device: derives the same key from the host's public key and opens what was sealed for it.
 * Without WebCrypto (e.g. plain-HTTP LAN origins) nothing is sealed; callers then fall back to
 * sending each device only its own data.
 */
import {
  deriveSealKey,
  exportPublicKey,
  generateSealKeyPair,
  seal,
  unseal,
  type SealedBox,
} from './sealCrypto';

export const isSealingSupported = (): boolean =>
  typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined';

export class SealChannel {
  protected readonly keyPair: Promise<CryptoKeyPair | null>;
  protected readonly seatKeys = new Map<number, CryptoKey>();
  protected hostKey: { jwk: string; key: CryptoKey } | null = null;
  protected readonly supported: boolean;

  constructor(supported = isSealingSupported()) {
    this.supported = supported;
    this.keyPair = supported ? generateSealKeyPair().catch(() => null) : Promise.resolve(null);
  }

  async publicKey(): Promise<JsonWebKey | undefined> {
    const pair = await this.keyPair;
    return pair ? exportPublicKey(pair.publicKey) : undefined;
  }

  // ─── Host ─────────────────────────────────────────────────────────────

  async registerSeat(seat: number, theirPublic: JsonWebKey): Promise<void> {
    const pair = await this.keyPair;
    if (!pair) return;
    this.seatKeys.set(seat, await deriveSealKey(pair.privateKey, theirPublic));
  }

  /** Any JSON value sealed for one seat; `undefined` without a seat key. */
  async sealFor(seat: number, value: unknown): Promise<SealedBox | undefined> {
    const key = this.seatKeys.get(seat);
    return key ? seal(key, value) : undefined;
  }

  // ─── Seat device ──────────────────────────────────────────────────────

  protected async keyFor(hostPublic: JsonWebKey): Promise<CryptoKey | null> {
    const jwk = JSON.stringify(hostPublic);
    if (this.hostKey?.jwk === jwk) return this.hostKey.key;
    const pair = await this.keyPair;
    if (!pair) return null;
    this.hostKey = { jwk, key: await deriveSealKey(pair.privateKey, hostPublic) };
    return this.hostKey.key;
  }

  /** Remembers the host's key so later boxes can be opened. */
  async acceptHostKey(hostPublic: JsonWebKey | undefined): Promise<void> {
    if (hostPublic && this.supported) await this.keyFor(hostPublic);
  }

  /** Opens a box the host sealed for this device; `null` when it cannot be opened. */
  async openFromHost<T>(box: SealedBox): Promise<T | null> {
    if (!this.hostKey) return null;
    try {
      return await unseal<T>(this.hostKey.key, box);
    } catch {
      return null;
    }
  }
}
