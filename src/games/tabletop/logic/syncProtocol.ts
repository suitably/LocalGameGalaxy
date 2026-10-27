/**
 * Tabletop Real-Time Sync Protocol [ID: GAME-TABLETOP-SYNC-PROTOCOL]
 *
 * Host-authoritative: other devices send their actions as `INTENT`, the host applies them and
 * broadcasts the resulting `STATE_DELTA` with a sequence number. A device that misses a
 * sequence number (or just joined) asks for a `STATE_SNAPSHOT`.
 */
import type { TabletopGameDefinition } from './types';
import type { TabletopAction } from './tabletopReducer';
import type { GameDelta } from './stateDelta';
import type { SealedSecrets } from './privateHandChannel';

export type TabletopSyncAction =
  /**
   * `seat` + `publicKey` let the host seal that seat's private hand for this device. `playerId`
   * is the sender's party player id; the host decides from its own roster whether it may play.
   */
  | {
      type: 'REQUEST_SNAPSHOT';
      seat?: number;
      publicKey?: JsonWebKey;
      spectator?: boolean;
      playerId?: string;
    }
  | {
      type: 'STATE_SNAPSHOT';
      state: TabletopGameDefinition;
      seq: number;
      hostKey?: JsonWebKey;
      sealed?: SealedSecrets;
    }
  | { type: 'STATE_DELTA'; delta: GameDelta; seq: number; sealed?: SealedSecrets }
  /** `spectator` is the sender's own claim; it can only make the sender read-only, never a player. */
  | { type: 'INTENT'; action: TabletopAction; spectator?: boolean; playerId?: string }
  | { type: 'FLICK_CARD_TO_TABLE'; cardId: string; targetHolderId: string; senderSeat?: number }
  | { type: 'RETURN_TO_LOBBY' };

export interface TabletopSyncEnvelope {
  type: 'TABLETOP_SYNC';
  roomId: string;
  senderId: string;
  action: TabletopSyncAction;
  timestamp: number;
}

/** Actions that stay on the device: loading, remote state and the card-flight animation. */
const LOCAL_ONLY_ACTIONS = new Set<TabletopAction['type']>([
  'LOAD_GAME',
  'APPLY_REMOTE_DELTA',
  'ANIMATE_CARD_TO_TABLE',
  'FINISH_ANIMATION',
]);

/** Whether a non-host device must send this action to the host. */
export const isSyncedIntent = (action: TabletopAction): boolean =>
  !LOCAL_ONLY_ACTIONS.has(action.type);

/**
 * Whether the host applies an intent. Spectators are read-only: every synced intent (move, flip,
 * draw, shuffle, roll, edit …) is rejected, only device-local actions pass (and are never sent).
 */
export const acceptIntent = (action: TabletopAction, sender: { spectator: boolean }): boolean =>
  isSyncedIntent(action) && !sender.spectator;

/** A party member as the host's roster knows it. */
export interface RosterEntry {
  id: string;
  spectator?: boolean;
}

/**
 * Whether the host treats a sender as a spectator. With a party roster for the room, only a listed
 * member without the spectator role may play, so a client cannot opt out by leaving the flag off.
 * Without a roster (no party), the sender's own claim decides.
 */
export function senderIsSpectator(sender: {
  claimed: boolean;
  playerId?: string;
  roster: RosterEntry[] | null;
}): boolean {
  if (sender.claimed) return true;
  if (!sender.roster || sender.roster.length === 0) return false;
  const member = sender.roster.find((p) => p.id === sender.playerId);
  return !member || Boolean(member.spectator);
}

/** How a device handles a delta: apply it, or ask for a snapshot because one was missed. */
export function classifyDelta(lastSeq: number | null, seq: number): 'apply' | 'ignore' | 'resync' {
  if (lastSeq === null) return 'ignore'; // waiting for the first snapshot
  if (seq <= lastSeq) return 'ignore'; // duplicate or late
  return seq === lastSeq + 1 ? 'apply' : 'resync';
}
