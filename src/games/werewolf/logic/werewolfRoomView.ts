/**
 * What one seat of a Werewolf room game may see [ID: GAME-WEREWOLF-ROOM-VIEW-LOGIC]
 *
 * Roles never leave the host except to their owner: a player sees their own role, the pack sees
 * its wolves, lovers see each other, the seer sees what they checked. During their night turn a
 * player gets the table as `Player[]` (no roles) so the pass-and-play role views work unchanged;
 * the witch additionally sees who the wolves picked. Everything is revealed at game over.
 */
import { DEFAULT_ROLES } from './defaultRoles';
import type { GamePhase, GameState, Player, PlayerPowerState, Role } from './types';
import { isWerewolf } from './utils';
import {
  currentNightRole,
  nightActorIds,
  tallyRoomVotes,
  type RoomInsight,
  type RoomSeat,
  type WerewolfRoomState,
} from './werewolfRoom';

export interface RoomPublicPlayer {
  id: string;
  name: string;
  isAlive: boolean;
}

export interface RoomTurn {
  role: Role;
  /** The table for the pass-and-play role views: no roles, the witch sees the wolves' victim. */
  players: Player[];
  /** Other players acting with this device (the rest of the pack). */
  partners: string[];
  /** Pack vote so far, wolves only: wolf id → victim id (`null`: nobody). */
  picks: Record<string, string | null>;
}

export interface WerewolfRoomView {
  hostId: string;
  narrator: boolean;
  phase: GamePhase;
  round: number;
  /** Before the game: the room's roster; afterwards the players in the game. */
  roster: RoomSeat[];
  players: RoomPublicPlayer[];
  seenCount: number;
  votedCount: number;
  /** The role the narrator calls right now (night only). */
  calling: Role | null;
  /** Position of `calling` in this night's order (0 = night just fell). */
  callIndex: number;
  /** Game device's clock (ms) when the pack vote closes (while the wolves are called). */
  packEndsAt: number | null;
  /** Living players ready to vote (day). */
  readyCount: number;
  /** Who died last night (day only). */
  victims: string[];
  /** The hunter who has to shoot now. */
  hunter: string | null;
  winner: GameState['winner'];
  me: {
    id: string;
    role: Role;
    isAlive: boolean;
    seen: boolean;
    ready: boolean;
    vote: string | null;
    powerState: PlayerPowerState;
    pack: string[];
    lovers: string[];
    insights: RoomInsight[];
    turn: RoomTurn | null;
  } | null;
  /** Only at game over: every role and the last vote. */
  result: { roles: Record<string, Role>; tally: Record<string, number> } | null;
}

const tablePlayer = (p: Player, showVictim: boolean): Player => ({
  id: p.id,
  name: p.name,
  role: null,
  isAlive: p.isAlive,
  needsToAct: false,
  powerState: showVictim && p.powerState.isDeadSoon ? { isDeadSoon: true } : {},
});

function turnFor(state: WerewolfRoomState, player: Player): RoomTurn | null {
  const role = currentNightRole(state);
  if (!role) return null;
  const actors = nightActorIds(state.game, role);
  if (!actors.includes(player.id)) return null;
  return {
    role,
    players: state.game.players.map((p) => tablePlayer(p, role === 'WITCH')),
    partners: actors.filter((id) => id !== player.id),
    picks: role === 'WEREWOLF' ? state.packPicks : {},
  };
}

function meFor(state: WerewolfRoomState, player: Player): WerewolfRoomView['me'] {
  const { game } = state;
  const wolf = isWerewolf(player, DEFAULT_ROLES);
  return {
    id: player.id,
    role: player.role ?? 'VILLAGER',
    isAlive: player.isAlive,
    seen: state.seen.includes(player.id),
    ready: state.ready.includes(player.id),
    vote: state.votes[player.id] ?? null,
    powerState: player.powerState,
    pack: wolf
      ? game.players
          .filter((p) => p.id !== player.id && isWerewolf(p, DEFAULT_ROLES))
          .map((p) => p.id)
      : [],
    lovers: player.powerState.loverIds ?? [],
    insights: state.insights[player.id] ?? [],
    turn: turnFor(state, player),
  };
}

/** What one seat (or the table and the narrator, `null`) may see. */
export function werewolfRoomView(state: WerewolfRoomState, seat: number | null): WerewolfRoomView {
  const { game } = state;
  const player = seat === null ? undefined : game.players[seat];
  const over = game.phase === 'GAME_OVER';
  return {
    hostId: state.hostId,
    narrator: state.narrator,
    phase: game.phase,
    round: game.round,
    roster:
      game.phase === 'SETUP' ? state.roster : game.players.map(({ id, name }) => ({ id, name })),
    players: game.players.map(({ id, name, isAlive }) => ({ id, name, isAlive })),
    seenCount: state.seen.length,
    votedCount: Object.keys(state.votes).length,
    calling: currentNightRole(state),
    callIndex: state.nightStep,
    packEndsAt: state.packEndsAt,
    readyCount: state.ready.length,
    victims: game.phase === 'DAY' ? game.nightActionLog : [],
    hunter: game.phase === 'HUNTER_SHOT' ? (game.pendingHunterIds[0] ?? null) : null,
    winner: game.winner,
    me: player && game.phase !== 'SETUP' ? meFor(state, player) : null,
    result: over
      ? {
          roles: Object.fromEntries(game.players.map((p) => [p.id, p.role ?? 'VILLAGER'])),
          tally: tallyRoomVotes(state.votes),
        }
      : null,
  };
}

/** Public players as engine players (no roles) for the pass-and-play views. */
export function asPlayers(players: RoomPublicPlayer[]): Player[] {
  return players.map((p) => ({ ...p, role: null, needsToAct: false, powerState: {} }));
}
