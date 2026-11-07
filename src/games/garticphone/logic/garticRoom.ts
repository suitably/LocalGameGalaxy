/**
 * Gartic Phone in a party room: pure reducer for `useRoomReducer` [ID: GARTIC-ROOM-REDUCER]
 *
 * The party host applies every action; guests only send them (#647 S6). `authorize` keeps a
 * player from submitting or joining for somebody else and reserves host actions for the host.
 */
import {
  addPlayerToGarticGame,
  createInitialGarticState,
  startGarticGame,
  submitPlayerGarticStep,
} from '../garticEngine';
import type { GarticGameState, GarticPlayer } from '../types';

export type GarticRoomAction =
  | { type: 'join'; player: GarticPlayer }
  | { type: 'stepSubmit'; playerId: string; content: string }
  | { type: 'reveal'; bookIndex: number; stepIndex: number }
  | { type: 'restart' }
  | { type: 'forceEnd' };

/** Guest placeholder until the host's first state arrives. */
export function emptyGarticState(roomId: string): GarticGameState {
  return { ...createInitialGarticState('', '', roomId), players: [], books: [], totalRounds: 0 };
}

export function garticRoomReducer(
  state: GarticGameState,
  action: GarticRoomAction,
): GarticGameState {
  switch (action.type) {
    case 'join':
      return addPlayerToGarticGame(state, action.player);
    case 'stepSubmit':
      return submitPlayerGarticStep(state, action.playerId, action.content);
    case 'reveal':
      return state.currentRevealBookIndex === action.bookIndex &&
        state.currentRevealStepIndex === action.stepIndex
        ? state
        : {
            ...state,
            currentRevealBookIndex: action.bookIndex,
            currentRevealStepIndex: action.stepIndex,
          };
    case 'restart':
      return startGarticGame({ ...state, phase: 'prompt', roundIndex: 0, books: [] });
    case 'forceEnd':
      return state.phase === 'lobby' ? state : { ...state, phase: 'lobby' };
  }
}

export function garticRoomAllows(
  state: GarticGameState,
  action: GarticRoomAction,
  from: string,
): boolean {
  switch (action.type) {
    case 'join':
      return action.player.id === from || from === state.hostId;
    case 'stepSubmit':
      return action.playerId === from;
    default:
      return from === state.hostId;
  }
}
