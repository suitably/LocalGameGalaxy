/**
 * Keeps hands and hidden zones private across the shared sync channel [ID: LOGIC-TABLETOP-PRIVATE-HANDS]
 *
 * Host: redacts outgoing snapshots/deltas (private hand faces, widgets in hidden zones) and seals
 * what each seat may see with that seat's key.
 * Seat device: sends its public key, derives the shared key from the host's public key and
 * restores its own cards. Without WebCrypto (e.g. plain-HTTP LAN origins) it passes data through
 * unchanged, which is the previous, non-private behaviour.
 */
import type { TabletopGameDefinition } from './types';
import type { GameDelta } from './stateDelta';
import { redactDelta, redactGame, restoreCards, type WidgetSecret } from './handPrivacy';
import {
  hasActiveHiddenZone,
  redactZoneWidgets,
  withZoneVisibilityChanges,
  type BroadcastSecrets,
} from './hiddenZoneRedaction';
import {
  deriveSealKey,
  exportPublicKey,
  generateSealKeyPair,
  seal,
  unseal,
  type SealedBox,
} from './sealCrypto';

export type SealedSecrets = Record<number, SealedBox>;

export const isSealingSupported = (): boolean =>
  typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined';

export class PrivateHandChannel {
  private readonly keyPair: Promise<CryptoKeyPair | null>;
  private readonly seatKeys = new Map<number, CryptoKey>();
  private hostKey: { jwk: string; key: CryptoKey } | null = null;

  private readonly supported: boolean;

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

  /** Hands are redacted once a seat registered a key. */
  private get privateHands(): boolean {
    return this.supported && this.seatKeys.size > 0;
  }

  /** Hidden zones are redacted whenever sealing works, so seatless devices and spectators see nothing. */
  private hidesZones(game: Pick<TabletopGameDefinition, 'hiddenZones'>): boolean {
    return this.supported && hasActiveHiddenZone(game.hiddenZones);
  }

  private async sealAll(secrets: BroadcastSecrets): Promise<SealedSecrets | undefined> {
    const sealed: SealedSecrets = {};
    for (const [seat, cards] of Object.entries(secrets)) {
      const key = this.seatKeys.get(Number(seat));
      if (key) sealed[Number(seat)] = await seal(key, cards);
    }
    return Object.keys(sealed).length > 0 ? sealed : undefined;
  }

  /** Snapshot as broadcast: private data removed, what each seat may see sealed for that seat. */
  async outgoingSnapshot(game: TabletopGameDefinition) {
    const hostKey = await this.publicKey();
    if (!this.privateHands && !this.hidesZones(game)) return { state: game, hostKey };
    const hand = this.privateHands ? redactGame(game) : { game, secrets: {} };
    const { widgets, secrets } = redactZoneWidgets(
      game.widgets,
      { widgets: hand.game.widgets, secrets: hand.secrets },
      game.hiddenZones,
    );
    return { state: { ...game, widgets }, sealed: await this.sealAll(secrets), hostKey };
  }

  /** `gameBefore` lets a zone change resend the widgets whose visibility it changed. */
  async outgoingDelta(
    delta: GameDelta,
    gameAfter: TabletopGameDefinition,
    gameBefore?: TabletopGameDefinition,
  ) {
    const zones = this.hidesZones(gameAfter) || this.hidesZones(gameBefore ?? gameAfter);
    if (!this.privateHands && !zones) return { delta };
    const full =
      gameBefore && zones ? withZoneVisibilityChanges(delta, gameBefore, gameAfter) : delta;
    const hand = this.privateHands ? redactDelta(full, gameAfter) : { delta: full, secrets: {} };
    const { widgets, secrets } = redactZoneWidgets(
      full.widgets,
      { widgets: hand.delta.widgets, secrets: hand.secrets },
      gameAfter.hiddenZones,
    );
    return { delta: { ...full, widgets }, sealed: await this.sealAll(secrets) };
  }

  // ─── Seat device ──────────────────────────────────────────────────────

  private async keyFor(hostPublic: JsonWebKey): Promise<CryptoKey | null> {
    const jwk = JSON.stringify(hostPublic);
    if (this.hostKey?.jwk === jwk) return this.hostKey.key;
    const pair = await this.keyPair;
    if (!pair) return null;
    this.hostKey = { jwk, key: await deriveSealKey(pair.privateKey, hostPublic) };
    return this.hostKey.key;
  }

  /** Remembers the host's key from a snapshot so later deltas can be opened. */
  async acceptHostKey(hostPublic: JsonWebKey | undefined): Promise<void> {
    if (hostPublic && this.supported) await this.keyFor(hostPublic);
  }

  /** This seat's cards restored in received widgets; others' stay redacted. */
  async open<T extends Record<string, unknown>>(
    widgets: T,
    sealed: SealedSecrets | undefined,
    seat: number | null,
  ): Promise<T> {
    const box = seat !== null ? sealed?.[seat] : undefined;
    if (!box || !this.hostKey) return widgets;
    try {
      const secrets = await unseal<Record<string, WidgetSecret>>(this.hostKey.key, box);
      return restoreCards(widgets as never, secrets) as T;
    } catch {
      return widgets;
    }
  }
}
