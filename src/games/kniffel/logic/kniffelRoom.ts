/**
 * Kniffel with everyone on their own device [ID: GAME-KNIFFEL-ROOM]
 *
 * The turn order and scoring are the single-device reducer's (`kniffelReducer`); the room adds
 * who may act: only the player whose turn it is rolls, holds and scores, only the host deals.
 * Every device shows the shared dice and the whole score sheet (its own column highlighted).
 */
import { createEmptyScores, kniffelReducer, INITIAL_KNIFFEL_STATE } from './kniffelReducer';
import type { KniffelCategory, KniffelState } from './types';

export interface KniffelRoomState extends KniffelState {
  /** Party host's player id; only the host starts or restarts. */
  hostId: string;
}

export type KniffelRoomAction =
  | { type: 'START'; hostId: string; players: { id: string; name: string }[] }
  | { type: 'ROLL'; dice: number[] }
  | { type: 'HOLD'; index: number }
  | { type: 'SCORE'; category: KniffelCategory; score: number }
  | { type: 'NEW_GAME' };

export const INITIAL_KNIFFEL_ROOM: KniffelRoomState = {
  ...INITIAL_KNIFFEL_STATE,
  players: [],
  hostId: '',
};

const isDie = (n: number) => Number.isInteger(n) && n >= 1 && n <= 6;

export function kniffelRoomReducer(
  state: KniffelRoomState,
  action: KniffelRoomAction,
): KniffelRoomState {
  switch (action.type) {
    case 'START':
      return {
        ...INITIAL_KNIFFEL_ROOM,
        hostId: action.hostId,
        players: action.players.map(({ id, name }) => ({ id, name, scores: createEmptyScores() })),
      };
    case 'NEW_GAME':
      return { ...state, ...kniffelReducer(state, { type: 'NEW_GAME' }) };
    case 'ROLL': {
      if (state.isGameOver || action.dice.length !== 5 || !action.dice.every(isDie)) return state;
      // Held dice stay as they are, whatever the sender rolled.
      const dice = action.dice.map((d, i) => (state.heldDice[i] ? state.dice[i] : d));
      return { ...state, ...kniffelReducer(state, { type: 'ROLL_DICE', dice }) };
    }
    case 'HOLD':
      return {
        ...state,
        ...kniffelReducer(state, { type: 'TOGGLE_HOLD_DIE', index: action.index }),
      };
    case 'SCORE': {
      if (state.isGameOver || state.rollCount === 0) return state;
      const scores = state.players[state.activePlayerIndex]?.scores;
      // A category is written once (the bonus counts up instead).
      if (!scores || (action.category !== 'kniffel_bonus' && scores[action.category] !== null))
        return state;
      return { ...state, ...kniffelReducer(state, { ...action, type: 'SCORE_CATEGORY' }) };
    }
    default:
      return state;
  }
}

/** Host-side rule: only the player whose turn it is plays; only the host starts or restarts. */
export function kniffelRoomAllows(
  state: KniffelRoomState,
  action: KniffelRoomAction,
  from: string,
): boolean {
  if (action.type === 'START' || action.type === 'NEW_GAME')
    return from === state.hostId || !state.hostId;
  return state.players[state.activePlayerIndex]?.id === from;
}
