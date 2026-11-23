/**
 * Knister for several players on one device [ID: GAME-KNISTER-LOCAL]
 *
 * Same rule as the room game (`knisterRoom.ts`): one roll counts for every player. The device is
 * passed around until everybody placed the sum, then the next roll is possible. A number typed in
 * instead of rolled (real dice) becomes the roll for the others. One player: `knisterReducer`.
 */
import { knisterReducer } from './knisterReducer';
import { knisterRoomReducer } from './knisterRoom';
import type { KnisterAction, KnisterState } from './types';

export interface KnisterLocalState extends KnisterState {
  /** Players who already placed the current roll (several players only). */
  placed?: string[];
}

const MANUAL = { die1: 0, die2: 0 };

/** Next player after `index` who has not placed the current roll yet; wraps around. */
function nextOpenIndex(state: KnisterLocalState, index: number, placed: string[]): number {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const i = (index + step) % n;
    if (!placed.includes(state.players[i].id)) return i;
  }
  return (index + 1) % n;
}

function place(
  state: KnisterLocalState,
  action: Extract<KnisterAction, { type: 'PLACE_NUMBER' }>,
): KnisterLocalState {
  const placed = state.placed ?? [];
  const playerId = action.playerId ?? state.players[state.activePlayerIndex]?.id;
  if (!playerId || state.isGameOver) return state;
  let base: KnisterLocalState = state;
  if (!state.currentRoll) {
    // Typed-in number: becomes this round's roll for everybody.
    if (action.value === undefined || action.value < 2 || action.value > 12) return state;
    const roll = { ...MANUAL, sum: action.value };
    base = {
      ...state,
      currentRoll: roll,
      rollCount: state.rollCount + 1,
      rollHistory: [roll, ...state.rollHistory],
    };
  }
  const next = knisterRoomReducer(
    { ...base, placed, hostId: '' },
    { type: 'PLACE', row: action.row, col: action.col, playerId },
  );
  if (next.moveHistory.length === base.moveHistory.length) return state;
  const index = state.players.findIndex((p) => p.id === playerId);
  return {
    ...state,
    players: next.players,
    currentRoll: next.currentRoll,
    rollCount: next.rollCount,
    rollHistory: next.rollHistory,
    moveHistory: next.moveHistory,
    isGameOver: next.isGameOver,
    highScore: next.highScore,
    placed: next.placed,
    activePlayerIndex: nextOpenIndex(state, index, next.placed),
  };
}

function undo(state: KnisterLocalState): KnisterLocalState {
  const last = state.moveHistory[state.moveHistory.length - 1];
  if (!last) return state;
  const next = knisterReducer(state, { type: 'UNDO_MOVE' });
  if (next === state) return state;
  const index = state.players.findIndex((p) => p.id === last.playerId);
  // The round this move finished was emptied by the reducer; rebuild who had placed it.
  const placed = (state.placed?.length ? state.placed : state.players.map((p) => p.id)).filter(
    (id) => id !== last.playerId,
  );
  const roll = next.currentRoll;
  if (placed.length === 0 && roll && roll.die1 === 0 && roll.die2 === 0) {
    // Nobody placed the typed-in number any more: it is no roll yet.
    return {
      ...next,
      currentRoll: null,
      rollCount: Math.max(0, next.rollCount - 1),
      rollHistory: next.rollHistory.slice(1),
      placed: [],
      activePlayerIndex: Math.max(0, index),
    };
  }
  return { ...next, placed, activePlayerIndex: Math.max(0, index) };
}

/**
 * Undo takes back the last placement only until the next roll: with a new roll on the table that
 * nobody placed yet, undoing would put the previous roll back over it.
 */
export function canUndoLocal(state: KnisterLocalState): boolean {
  if (state.isGameOver || state.moveHistory.length === 0) return false;
  return !(state.currentRoll && (state.placed ?? []).length === 0);
}

export function knisterLocalReducer(
  state: KnisterLocalState,
  action: KnisterAction,
): KnisterLocalState {
  if (action.type === 'UNDO_MOVE' && !canUndoLocal(state)) return state;
  if (state.players.length < 2) return knisterReducer(state, action);
  switch (action.type) {
    case 'PLACE_NUMBER':
      return place(state, action);
    case 'UNDO_MOVE':
      return undo(state);
    case 'ROLL_DICE':
      // No new roll while the current one still has to be placed by someone.
      return state.currentRoll ? state : knisterReducer(state, action);
    case 'SWITCH_PLAYER':
      return knisterReducer(state, action);
    default:
      return { ...knisterReducer(state, action), placed: [] };
  }
}
