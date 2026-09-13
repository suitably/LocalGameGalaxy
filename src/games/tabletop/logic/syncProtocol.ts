/**
 * Tabletop Real-Time Sync Protocol [ID: GAME-TABLETOP-SYNC-PROTOCOL]
 */
import type { TabletopGameDefinition } from './types';

export type TabletopSyncAction =
  | { type: 'REQUEST_SNAPSHOT' }
  | { type: 'STATE_SNAPSHOT'; state: TabletopGameDefinition }
  | { type: 'FLICK_CARD_TO_TABLE'; cardId: string; targetHolderId: string; senderSeat?: number }
  | { type: 'DRAW_CARD'; deckId: string; targetHolderId?: string }
  | { type: 'ROLL_DICE'; dieIds: string[] }
  | { type: 'MOVE_WIDGET'; id: string; x: number; y: number; zIndex?: number }
  | { type: 'UPDATE_COUNTER'; counterId: string; delta: number }
  | { type: 'RETURN_TO_LOBBY' };

export interface TabletopSyncEnvelope {
  type: 'TABLETOP_SYNC';
  roomId: string;
  senderId: string;
  action: TabletopSyncAction;
  timestamp: number;
}
