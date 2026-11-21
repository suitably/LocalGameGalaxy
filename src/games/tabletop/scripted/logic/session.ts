/**
 * One table of a scripted card game: players, seats and the script's state [ID: LOGIC-TABLETOP-SCRIPT-SESSION]
 *
 * Pure reducer, run by the host (party room) or locally (one device). Random results come from
 * the seed chosen at `START` and the number of moves so far, so the same actions give the same
 * table on every run.
 */
import { seededRng, type Rng } from '../../logic/rng';
import { getScript } from './scriptRegistry';
import type { ScriptMove, ScriptOptions, ScriptView } from './scriptTypes';

export interface SessionPlayer {
  id: string;
  name: string;
}

export interface SessionState {
  scriptId: string;
  /** Seat order; empty until the game was started. */
  players: SessionPlayer[];
  seed: number;
  /** Accepted moves so far. */
  step: number;
  game: unknown | null;
}

export type SessionAction =
  | {
      type: 'START';
      scriptId: string;
      players: SessionPlayer[];
      seed: number;
      options?: ScriptOptions;
    }
  | { type: 'MOVE'; seat: number; move: ScriptMove }
  /** Back to the setup (new players, other seats). */
  | { type: 'END' };

export const emptySession = (scriptId: string): SessionState => ({
  scriptId,
  players: [],
  seed: 0,
  step: 0,
  game: null,
});

const rngFor = (seed: number, step: number): Rng =>
  seededRng((seed ^ Math.imul(step + 1, 0x9e3779b1)) >>> 0);

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START': {
      const script = getScript(action.scriptId);
      const count = action.players.length;
      if (!script || count < script.minPlayers || count > script.maxPlayers) return state;
      return {
        scriptId: action.scriptId,
        players: action.players,
        seed: action.seed,
        step: 0,
        game: script.start(count, rngFor(action.seed, -1), action.options ?? {}),
      };
    }
    case 'MOVE': {
      const script = getScript(state.scriptId);
      if (!script || state.game === null || !state.players[action.seat]) return state;
      const game = script.move(
        state.game,
        action.seat,
        action.move,
        rngFor(state.seed, state.step),
      );
      return game === state.game ? state : { ...state, game, step: state.step + 1 };
    }
    case 'END':
      return state.game === null ? state : emptySession(state.scriptId);
  }
}

/** The host may do everything; a player only moves for the own seat. */
export function sessionAllows(
  state: SessionState,
  action: SessionAction,
  from: string,
  hostId: string,
): boolean {
  if (from === hostId) return true;
  return action.type === 'MOVE' && state.players[action.seat]?.id === from;
}

/** Whether `move` would be accepted now (the script is pure, so trying it is free). */
export function moveAllowed(state: SessionState, seat: number, move: ScriptMove): boolean {
  const script = getScript(state.scriptId);
  if (!script || state.game === null) return false;
  return script.move(state.game, seat, move, rngFor(state.seed, state.step)) !== state.game;
}

export function sessionView(state: SessionState, viewer: number | null): ScriptView | null {
  const script = getScript(state.scriptId);
  return script && state.game !== null ? script.view(state.game, viewer) : null;
}

/** Players that fit the game: the first `maxPlayers`, or `null` when too few. */
export function seatPlayers(scriptId: string, players: SessionPlayer[]): SessionPlayer[] | null {
  const script = getScript(scriptId);
  if (!script || players.length < script.minPlayers) return null;
  return players.slice(0, script.maxPlayers);
}
