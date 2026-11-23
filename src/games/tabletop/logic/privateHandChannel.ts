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
import {
  redactDelta,
  redactGame,
  restoreCards,
  withGrantChanges,
  type WidgetSecret,
} from './handPrivacy';
import {
  hasActiveHiddenZone,
  redactZoneWidgets,
  withZoneVisibilityChanges,
  type BroadcastSecrets,
} from './hiddenZoneRedaction';
import { seal, unseal, type SealedBox } from '../../../modules/room-game/sealed/sealCrypto';
import { SealChannel } from '../../../modules/room-game/sealed/sealChannel';

export { isSealingSupported } from '../../../modules/room-game/sealed/sealChannel';

export type SealedSecrets = Record<number, SealedBox>;

/** Tabletop redaction (hands, hidden zones) on top of the shared seal channel. */
export class PrivateHandChannel extends SealChannel {
  // ─── Host ─────────────────────────────────────────────────────────────

  /**
   * Hands are redacted whenever sealing works, also before (or without) any seat key, so a
   * spectator-only room never gets faces in clear (#685).
   */
  private get privateHands(): boolean {
    return this.supported;
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

  /**
   * `gameBefore` lets a zone change or a view request (#557) resend the widgets whose visibility
   * it changed.
   */
  async outgoingDelta(
    delta: GameDelta,
    gameAfter: TabletopGameDefinition,
    gameBefore?: TabletopGameDefinition,
  ) {
    const zones = this.hidesZones(gameAfter) || this.hidesZones(gameBefore ?? gameAfter);
    if (!this.privateHands && !zones) return { delta };
    const granted =
      gameBefore && this.privateHands ? withGrantChanges(delta, gameBefore, gameAfter) : delta;
    const full =
      gameBefore && zones ? withZoneVisibilityChanges(granted, gameBefore, gameAfter) : granted;
    const hand = this.privateHands ? redactDelta(full, gameAfter) : { delta: full, secrets: {} };
    const { widgets, secrets } = redactZoneWidgets(
      full.widgets,
      { widgets: hand.delta.widgets, secrets: hand.secrets },
      gameAfter.hiddenZones,
    );
    return { delta: { ...full, widgets }, sealed: await this.sealAll(secrets) };
  }

  // ─── Seat device ──────────────────────────────────────────────────────

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
