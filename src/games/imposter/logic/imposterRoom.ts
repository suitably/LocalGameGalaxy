/**
 * Imposter with everyone on their own device [ID: GAME-IMPOSTER-ROOM]
 *
 * The party host runs this reducer in a sealed room peer: each device only ever receives its own
 * view (`imposterRoomView`), so no device holds the word, the hint or who the imposters are
 * unless it may see them. Flow: host sets up → everyone reads their card and confirms → timed
 * discussion → everyone votes → the most votes is kicked (a tie kicks nobody: imposters win).
 */
export interface ImposterRoomPlayer {
  id: string;
  name: string;
}

export type ImposterRoomPhase = 'SETUP' | 'REVEAL' | 'DISCUSS' | 'VOTING' | 'RESULT';
export type ImposterWinner = 'IMPOSTERS' | 'NORMAL';

export interface ImposterRoomState {
  hostId: string;
  phase: ImposterRoomPhase;
  players: ImposterRoomPlayer[];
  imposterIds: string[];
  word: string | null;
  hint: string | null;
  /** Discussion length in seconds. */
  timerLength: number;
  /** Host clock (ms) when the discussion ends. */
  discussEndsAt: number | null;
  /** Players who confirmed their card. */
  seen: string[];
  /** Voter id → voted player id. */
  votes: Record<string, string>;
  kicked: string | null;
  winner: ImposterWinner | null;
}

export type ImposterRoomAction =
  | { type: 'SETUP'; hostId: string; players: ImposterRoomPlayer[] }
  | {
      type: 'START';
      word: string;
      hint: string;
      imposterIds: string[];
      timerLength: number;
    }
  | { type: 'SEEN'; playerId: string }
  | { type: 'DISCUSS'; at: number }
  | { type: 'START_VOTE' }
  | { type: 'VOTE'; playerId: string; target: string }
  | { type: 'NEW_ROUND' };

export const INITIAL_IMPOSTER_ROOM: ImposterRoomState = {
  hostId: '',
  phase: 'SETUP',
  players: [],
  imposterIds: [],
  word: null,
  hint: null,
  timerLength: 300,
  discussEndsAt: null,
  seen: [],
  votes: {},
  kicked: null,
  winner: null,
};

const seated = (state: ImposterRoomState, id: string) => state.players.some((p) => p.id === id);
const samePlayers = (a: ImposterRoomPlayer[], b: ImposterRoomPlayer[]) =>
  a.length === b.length && a.every((p, i) => p.id === b[i].id && p.name === b[i].name);

/** Votes per player id. */
export function tallyVotes(votes: Record<string, string>): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const target of Object.values(votes)) tally[target] = (tally[target] ?? 0) + 1;
  return tally;
}

/** The player with the most votes, or `null` on a tie. */
export function mostVoted(votes: Record<string, string>): string | null {
  const ranked = Object.entries(tallyVotes(votes)).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[0][1] === ranked[1]?.[1]) return null;
  return ranked[0][0];
}

/** Picks `count` distinct imposters (host side; `random` for tests). */
export function drawImposters(ids: string[], count: number, random = Math.random): string[] {
  const pool = [...ids];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(1, Math.min(count, ids.length - 1)));
}

export function imposterRoomReducer(
  state: ImposterRoomState,
  action: ImposterRoomAction,
): ImposterRoomState {
  switch (action.type) {
    case 'SETUP':
      // The roster follows the room until a round starts.
      if (state.phase !== 'SETUP' && state.hostId) return state;
      if (state.hostId === action.hostId && samePlayers(state.players, action.players))
        return state;
      return { ...state, hostId: action.hostId, players: action.players };
    case 'START': {
      if (state.phase !== 'SETUP' || state.players.length < 3) return state;
      const imposterIds = action.imposterIds.filter((id) => seated(state, id));
      if (imposterIds.length === 0 || imposterIds.length >= state.players.length) return state;
      return {
        ...state,
        phase: 'REVEAL',
        word: action.word,
        hint: action.hint,
        imposterIds,
        timerLength: action.timerLength,
        seen: [],
        votes: {},
        kicked: null,
        winner: null,
        discussEndsAt: null,
      };
    }
    case 'SEEN':
      if (state.phase !== 'REVEAL' || state.seen.includes(action.playerId)) return state;
      if (!seated(state, action.playerId)) return state;
      return { ...state, seen: [...state.seen, action.playerId] };
    case 'DISCUSS':
      if (state.phase !== 'REVEAL' || state.seen.length < state.players.length) return state;
      return { ...state, phase: 'DISCUSS', discussEndsAt: action.at + state.timerLength * 1000 };
    case 'START_VOTE':
      return state.phase === 'DISCUSS' ? { ...state, phase: 'VOTING' } : state;
    case 'VOTE': {
      const { playerId, target } = action;
      if (state.phase !== 'VOTING' || state.votes[playerId] || playerId === target) return state;
      if (!seated(state, playerId) || !seated(state, target)) return state;
      const votes = { ...state.votes, [playerId]: target };
      if (Object.keys(votes).length < state.players.length) return { ...state, votes };
      const kicked = mostVoted(votes);
      const winner: ImposterWinner =
        kicked && state.imposterIds.includes(kicked) ? 'NORMAL' : 'IMPOSTERS';
      return { ...state, votes, phase: 'RESULT', kicked, winner };
    }
    case 'NEW_ROUND':
      return { ...INITIAL_IMPOSTER_ROOM, hostId: state.hostId, players: state.players };
    default:
      return state;
  }
}

/** Host-side rule: players act only for themselves; only the host steers the round. */
export function imposterRoomAllows(
  _state: ImposterRoomState,
  action: ImposterRoomAction,
  from: string,
  hostId: string,
): boolean {
  if (action.type === 'SEEN' || action.type === 'VOTE') return action.playerId === from;
  return from === hostId;
}

export interface ImposterRoomView {
  hostId: string;
  phase: ImposterRoomPhase;
  players: ImposterRoomPlayer[];
  timerLength: number;
  discussEndsAt: number | null;
  seenCount: number;
  votedCount: number;
  /** The viewer's own card and moves; `null` for a device without a seat or before a round. */
  me: {
    id: string;
    imposter: boolean;
    /** The word for everyone else, the hint for an imposter. */
    clue: string;
    seen: boolean;
    vote: string | null;
  } | null;
  /** Only once the round is over. */
  result: {
    imposterIds: string[];
    word: string;
    hint: string;
    kicked: string | null;
    winner: ImposterWinner;
    tally: Record<string, number>;
  } | null;
}

/** What one seat (or the table, `null`) may see. */
export function imposterRoomView(state: ImposterRoomState, seat: number | null): ImposterRoomView {
  const player = seat === null ? undefined : state.players[seat];
  const inRound = state.phase !== 'SETUP' && state.word !== null && state.hint !== null;
  const imposter = player ? state.imposterIds.includes(player.id) : false;
  return {
    hostId: state.hostId,
    phase: state.phase,
    players: state.players,
    timerLength: state.timerLength,
    discussEndsAt: state.discussEndsAt,
    seenCount: state.seen.length,
    votedCount: Object.keys(state.votes).length,
    me:
      player && inRound
        ? {
            id: player.id,
            imposter,
            clue: (imposter ? state.hint : state.word) ?? '',
            seen: state.seen.includes(player.id),
            vote: state.votes[player.id] ?? null,
          }
        : null,
    result:
      state.phase === 'RESULT' && state.winner && state.word && state.hint
        ? {
            imposterIds: state.imposterIds,
            word: state.word,
            hint: state.hint,
            kicked: state.kicked,
            winner: state.winner,
            tally: tallyVotes(state.votes),
          }
        : null,
  };
}
