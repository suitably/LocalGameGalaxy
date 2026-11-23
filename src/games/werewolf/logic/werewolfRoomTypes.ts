/**
 * State and actions of a Werewolf room game (`werewolfRoom.ts`) [ID: GAME-WEREWOLF-ROOM-TYPES]
 */
import type { GameState, NightAction, Role } from './types';

export interface RoomSeat {
  id: string;
  name: string;
}

/** What the seer learned: only on the seer's own device. */
export interface RoomInsight {
  round: number;
  targetId: string;
  role: Role;
}

export interface WerewolfRoomState {
  hostId: string;
  /** The host device narrates only and gets no role. */
  narrator: boolean;
  /** The party room's players, kept in step until the game starts. */
  roster: RoomSeat[];
  game: GameState;
  /** Players who confirmed their role card. */
  seen: string[];
  /** Roles called this night, in order, and the one being called now. */
  nightOrder: Role[];
  nightStep: number;
  /** Voter id → voted player id. */
  votes: Record<string, string>;
  /** By player id. */
  insights: Record<string, RoomInsight[]>;
  /** Pack vote this night: wolf id → victim id (`null`: nobody). */
  packPicks: Record<string, string | null>;
  /** Game device's clock (ms) when the pack vote closes on its own. */
  packEndsAt: number | null;
  /** Living players ready to vote (day). */
  ready: string[];
}

export type WerewolfRoomAction =
  | { type: 'SETUP'; hostId: string; players: RoomSeat[] }
  | { type: 'START'; roles: Role[]; narrator: boolean }
  | { type: 'SEEN'; playerId: string }
  | { type: 'NIGHT_ACTION'; playerId: string; action: NightAction }
  | { type: 'NIGHT_SKIP'; playerId: string }
  | { type: 'PACK_TIMER'; at: number }
  | { type: 'END_PACK_VOTE' }
  | { type: 'READY'; playerId: string }
  | { type: 'VOTE'; playerId: string; target: string }
  | { type: 'HUNTER_SHOT'; playerId: string; targetId: string }
  | { type: 'NEW_GAME' };
