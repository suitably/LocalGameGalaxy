/**
 * Knister with everyone on their own device [ID: GAME-KNISTER-ROOM]
 *
 * Real Knister rules: one roll counts for every player. Each player writes the same sum on their
 * own sheet; the next roll is possible once everybody has placed it. The single-device reducer
 * (`knisterReducer`) does the placing and scoring; this file only adds who still has to place.
 */
import { createEmptyGrid } from './knisterScoring';
import { knisterReducer, INITIAL_KNISTER_STATE } from './knisterReducer';
import type { KnisterState } from './types';

export interface KnisterRoomState extends KnisterState {
  /** Players who already placed the current roll. */
  placed: string[];
  /** Party host's player id; only the host starts or restarts. */
  hostId: string;
}

export type KnisterRoomAction =
  | { type: 'START'; hostId: string; players: { id: string; name: string }[] }
  | { type: 'ROLL'; die1: number; die2: number }
  | { type: 'PLACE'; row: number; col: number; playerId: string }
  | { type: 'NEW_GAME' };

export const INITIAL_KNISTER_ROOM: KnisterRoomState = {
  ...INITIAL_KNISTER_STATE,
  players: [],
  placed: [],
  hostId: '',
};

const MAX_ROLLS = 25;

export function knisterRoomReducer(
  state: KnisterRoomState,
  action: KnisterRoomAction,
): KnisterRoomState {
  switch (action.type) {
    case 'START':
      return {
        ...INITIAL_KNISTER_ROOM,
        highScore: state.highScore,
        hostId: action.hostId,
        players: action.players.map((p) => ({ ...p, grid: createEmptyGrid(), isFilled: false })),
      };
    case 'NEW_GAME':
      return { ...state, ...knisterReducer(state, { type: 'NEW_GAME' }), placed: [] };
    case 'ROLL': {
      if (state.isGameOver || state.currentRoll || state.players.length === 0) return state;
      return { ...state, ...knisterReducer(state, { ...action, type: 'ROLL_DICE' }) };
    }
    case 'PLACE': {
      const roll = state.currentRoll;
      if (!roll || state.isGameOver || state.placed.includes(action.playerId)) return state;
      const next = knisterReducer(state, { ...action, type: 'PLACE_NUMBER' });
      if (next === state) return state;
      const placed = [...state.placed, action.playerId];
      const everyone = state.players.every((p) => placed.includes(p.id));
      const allFilled = next.players.every((p) => p.isFilled);
      return {
        ...state,
        ...next,
        currentRoll: everyone ? null : roll,
        placed: everyone ? [] : placed,
        isGameOver: allFilled || (everyone && next.rollCount >= MAX_ROLLS),
      };
    }
    default:
      return state;
  }
}

/** Host-side rule: players place only on their own sheet; only the host starts or restarts. */
export function knisterRoomAllows(
  state: KnisterRoomState,
  action: KnisterRoomAction,
  from: string,
): boolean {
  if (action.type === 'PLACE') return action.playerId === from;
  if (action.type === 'START' || action.type === 'NEW_GAME')
    return from === state.hostId || !state.hostId;
  return state.players.some((p) => p.id === from);
}
