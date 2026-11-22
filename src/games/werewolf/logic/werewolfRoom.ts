/**
 * Werewolf with everyone on their own device [ID: GAME-WEREWOLF-ROOM]
 *
 * The party host runs this reducer in a sealed room peer (`useWerewolfRoom`); each device only
 * receives its own view (`werewolfRoomView`). Roles, night resolution, the hunter and the win
 * check stay in the pass-and-play engine (`gameReducer`); this layer adds what a room needs:
 * every player confirms their role card, the night calls one role after the other and only that
 * role's phones act, everyone votes on their phone. The host device narrates; with `narrator`
 * it has no role at all (a TV or a game master).
 */
import { DEFAULT_ROLES } from './defaultRoles';
import { gameReducer } from './gameReducer';
import { getNightRolesToAct } from './nightRoles';
import {
  INITIAL_STATE,
  type GamePhase,
  type GameState,
  type NightAction,
  type Role,
} from './types';
import { getWinningFaction, isWerewolf } from './utils';

/** Roles a room game can deal: their night turns work on the acting player's own phone. */
export const ROOM_ROLES: Role[] = [
  'VILLAGER',
  'WEREWOLF',
  'SEER',
  'WITCH',
  'HUNTER',
  'CUPID',
  'GUARDIAN',
  'LITTLE_GIRL',
  'WISE',
  'ANGEL',
];

/** Night moves per role that is called at night. */
const NIGHT_MOVES: Partial<Record<Role, NightAction['type'][]>> = {
  CUPID: ['LINK_LOVERS'],
  GUARDIAN: ['PROTECT'],
  WEREWOLF: ['KILL'],
  WITCH: ['HEAL', 'KILL'],
  SEER: ['CHECK_ROLE'],
};

export const MIN_ROOM_PLAYERS = 4;

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
}

export type WerewolfRoomAction =
  | { type: 'SETUP'; hostId: string; players: RoomSeat[] }
  | { type: 'START'; roles: Role[]; narrator: boolean }
  | { type: 'SEEN'; playerId: string }
  | { type: 'NIGHT_ACTION'; playerId: string; action: NightAction }
  | { type: 'NIGHT_SKIP'; playerId: string }
  | { type: 'START_VOTE' }
  | { type: 'VOTE'; playerId: string; target: string }
  | { type: 'HUNTER_SHOT'; playerId: string; targetId: string }
  | { type: 'NEW_GAME' };

export const INITIAL_WEREWOLF_ROOM: WerewolfRoomState = {
  hostId: '',
  narrator: false,
  roster: [],
  game: { ...INITIAL_STATE, enabledRoles: [] },
  seen: [],
  nightOrder: [],
  nightStep: 0,
  votes: {},
  insights: {},
};

const sameSeats = (a: RoomSeat[], b: RoomSeat[]) =>
  a.length === b.length && a.every((p, i) => p.id === b[i].id && p.name === b[i].name);
const alive = (game: GameState, id: string) => game.players.some((p) => p.id === id && p.isAlive);

/** Who plays: the roster without the host when it only narrates. */
export function seatedPlayers(roster: RoomSeat[], hostId: string, narrator: boolean): RoomSeat[] {
  return narrator ? roster.filter((p) => p.id !== hostId) : roster;
}

/** The role called right now, or `null` outside the night. */
export function currentNightRole(state: WerewolfRoomState): Role | null {
  if (state.game.phase !== 'NIGHT') return null;
  return state.nightOrder[state.nightStep] ?? null;
}

/** Living players whose phones act for `role` (all werewolves for the pack). */
export function nightActorIds(game: GameState, role: Role): string[] {
  return game.players
    .filter(
      (p) => p.isAlive && (role === 'WEREWOLF' ? isWerewolf(p, DEFAULT_ROLES) : p.role === role),
    )
    .map((p) => p.id);
}

/** Votes per player id. */
export function tallyRoomVotes(votes: Record<string, string>): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const target of Object.values(votes)) tally[target] = (tally[target] ?? 0) + 1;
  return tally;
}

/** The player with the most votes, or `null` on a tie. */
export function lynchedBy(votes: Record<string, string>): string | null {
  const ranked = Object.entries(tallyRoomVotes(votes)).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[0][1] === ranked[1]?.[1]) return null;
  return ranked[0][0];
}

const targetsOf = (action: NightAction): string[] => {
  if ('targetId' in action) return [action.targetId];
  if ('targetIds' in action) return [...action.targetIds];
  return [];
};

function nightMoveValid(state: WerewolfRoomState, playerId: string, action: NightAction): boolean {
  const role = currentNightRole(state);
  if (!role || !nightActorIds(state.game, role).includes(playerId)) return false;
  if (!NIGHT_MOVES[role]?.includes(action.type)) return false;
  const targets = targetsOf(action);
  if (!targets.every((id) => alive(state.game, id))) return false;
  const me = state.game.players.find((p) => p.id === playerId);
  switch (action.type) {
    case 'LINK_LOVERS':
      return targets[0] !== targets[1];
    case 'HEAL': {
      const target = state.game.players.find((p) => p.id === action.targetId);
      return !!me?.powerState.hasHealPotion && !!target?.powerState.isDeadSoon;
    }
    case 'KILL':
      return role !== 'WITCH' || !!me?.powerState.hasKillPotion;
    default:
      return true;
  }
}

/** Night roles of this room game, in calling order. */
function roomNightOrder(game: GameState): Role[] {
  return getNightRolesToAct(game.players, [], game.round, game.nightActionLog).filter(
    (role) => role in NIGHT_MOVES,
  );
}

/** Follows the engine into its next phase: night order, fresh votes, win after the night. */
function settle(state: WerewolfRoomState, before: GamePhase): WerewolfRoomState {
  const game = state.game;
  if (game.phase === before) return state;
  switch (game.phase) {
    case 'DAY': {
      const winner = getWinningFaction(game.players, DEFAULT_ROLES, 'DAY', game.round);
      return winner ? { ...state, game: { ...game, phase: 'GAME_OVER', winner } } : state;
    }
    case 'VOTING':
      return { ...state, votes: {} };
    case 'NIGHT': {
      const nightOrder = roomNightOrder(game);
      const next = { ...state, votes: {}, nightOrder, nightStep: 0 };
      return nightOrder.length > 0 ? next : dawn(next);
    }
    default:
      return state;
  }
}

/** Runs one engine action and follows it into the next phase. */
function step(state: WerewolfRoomState, action: Parameters<typeof gameReducer>[1]) {
  // `gameReducer` writes to its input on NIGHT → DAY; hand it a copy.
  return settle({ ...state, game: gameReducer({ ...state.game }, action) }, state.game.phase);
}

function dawn(state: WerewolfRoomState): WerewolfRoomState {
  return step(state, { type: 'NEXT_PHASE' });
}

function nextNightRole(state: WerewolfRoomState): WerewolfRoomState {
  if (state.game.phase !== 'NIGHT') return state;
  const nightStep = state.nightStep + 1;
  const next = { ...state, nightStep };
  return nightStep >= state.nightOrder.length ? dawn(next) : next;
}

function applyNight(state: WerewolfRoomState, playerId: string, action: NightAction) {
  const role = currentNightRole(state) as Role;
  let next = step(state, { type: 'NIGHT_ACTION', action, role });
  if (action.type === 'CHECK_ROLE') {
    const target = state.game.players.find((p) => p.id === action.targetId);
    const insight = {
      round: state.game.round,
      targetId: action.targetId,
      role: target?.role ?? 'VILLAGER',
    };
    next = {
      ...next,
      insights: { ...next.insights, [playerId]: [...(next.insights[playerId] ?? []), insight] },
    };
  }
  if (role === 'WITCH' && action.type === 'KILL') {
    // The engine leaves the poison unused; a room game spends it.
    const players = next.game.players.map((p) =>
      p.id === playerId ? { ...p, powerState: { ...p.powerState, hasKillPotion: false } } : p,
    );
    next = { ...next, game: { ...next.game, players } };
  }
  return nextNightRole(next);
}

function startGame(state: WerewolfRoomState, roles: Role[], narrator: boolean) {
  const seats = seatedPlayers(state.roster, state.hostId, narrator);
  if (state.game.phase !== 'SETUP' || seats.length < MIN_ROOM_PLAYERS) return state;
  if (roles.length !== seats.length || !roles.every((r) => ROOM_ROLES.includes(r))) return state;
  if (!roles.some((r) => r === 'WEREWOLF')) return state;
  const players = seats.map((p) => ({
    id: p.id,
    name: p.name,
    role: null,
    isAlive: true,
    needsToAct: false,
    powerState: {},
  }));
  const game = gameReducer(
    { ...INITIAL_WEREWOLF_ROOM.game, players },
    { type: 'START_GAME', roles },
  );
  return {
    ...state,
    narrator,
    game,
    seen: [],
    votes: {},
    insights: {},
    nightOrder: [],
    nightStep: 0,
  };
}

export function werewolfRoomReducer(
  state: WerewolfRoomState,
  action: WerewolfRoomAction,
): WerewolfRoomState {
  const game = state.game;
  switch (action.type) {
    case 'SETUP':
      if (game.phase !== 'SETUP' && state.hostId) return state;
      if (state.hostId === action.hostId && sameSeats(state.roster, action.players)) return state;
      return { ...state, hostId: action.hostId, roster: action.players };
    case 'START':
      return startGame(state, action.roles, action.narrator);
    case 'SEEN': {
      if (game.phase !== 'ROLE_REVEAL' || state.seen.includes(action.playerId)) return state;
      if (!game.players.some((p) => p.id === action.playerId)) return state;
      const next = { ...state, seen: [...state.seen, action.playerId] };
      // Everyone has read their card: the first night falls.
      return next.seen.length >= game.players.length ? step(next, { type: 'NEXT_PHASE' }) : next;
    }
    case 'NIGHT_ACTION':
      return nightMoveValid(state, action.playerId, action.action)
        ? applyNight(state, action.playerId, action.action)
        : state;
    case 'NIGHT_SKIP': {
      const role = currentNightRole(state);
      if (!role || !nightActorIds(game, role).includes(action.playerId)) return state;
      return nextNightRole(state);
    }
    case 'START_VOTE':
      return game.phase === 'DAY' ? step(state, { type: 'NEXT_PHASE' }) : state;
    case 'VOTE': {
      const { playerId, target } = action;
      if (game.phase !== 'VOTING' || state.votes[playerId] || playerId === target) return state;
      if (!alive(game, playerId) || !alive(game, target)) return state;
      const votes = { ...state.votes, [playerId]: target };
      const next = { ...state, votes };
      if (Object.keys(votes).length < game.players.filter((p) => p.isAlive).length) return next;
      const lynched = lynchedBy(votes);
      return step(next, lynched ? { type: 'KILL_PLAYER', id: lynched } : { type: 'NEXT_PHASE' });
    }
    case 'HUNTER_SHOT':
      if (game.phase !== 'HUNTER_SHOT' || game.pendingHunterIds[0] !== action.playerId)
        return state;
      if (!alive(game, action.targetId)) return state;
      return step(state, { type: 'HUNTER_SHOT', targetId: action.targetId });
    case 'NEW_GAME':
      return { ...INITIAL_WEREWOLF_ROOM, hostId: state.hostId, roster: state.roster };
    default:
      return state;
  }
}

/** Host-side rule: players act only for themselves; only the host steers the game. */
export function werewolfRoomAllows(
  _state: WerewolfRoomState,
  action: WerewolfRoomAction,
  from: string,
  hostId: string,
): boolean {
  if ('playerId' in action) return action.playerId === from;
  return from === hostId;
}
