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

export type TabletopSyncAction =
  | { type: 'REQUEST_SNAPSHOT' }
  | { type: 'STATE_SNAPSHOT'; state: TabletopGameDefinition; seq: number }
  | { type: 'STATE_DELTA'; delta: GameDelta; seq: number }
  | { type: 'INTENT'; action: TabletopAction }
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

/** How a device handles a delta: apply it, or ask for a snapshot because one was missed. */
export function classifyDelta(lastSeq: number | null, seq: number): 'apply' | 'ignore' | 'resync' {
  if (lastSeq === null) return 'ignore'; // waiting for the first snapshot
  if (seq <= lastSeq) return 'ignore'; // duplicate or late
  return seq === lastSeq + 1 ? 'apply' : 'resync';
}
