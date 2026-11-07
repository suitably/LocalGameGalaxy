/**
 * GuessArt live in a party room: pure reducer for `useRoomReducer` [ID: LOGIC-GUESSART-ROOM]
 *
 * One game record and its active round are shared by everyone in the room. The party host
 * applies the actions; the drawer picks the word and draws, the guesser guesses and asks for
 * hints (#647 S5). Round rules come from `transitions.ts`.
 */
import { buildCompletedRoundInfo, type CompletedRoundInfo } from './completedRound';
import { DEFAULT_WORDS } from './lexicon';
import {
  advanceAfterCorrectGuess,
  applyGuess,
  applyHint,
  applyWordSelection,
  createEmptyRound,
} from './transitions';
import type { GuessArtGameRecord, GuessArtRound, SelectWordPayload } from './types';

export interface GuessArtRoomState {
  hostId: string;
  game: GuessArtGameRecord | null;
  round: GuessArtRound | null;
  /** The round guessed last, for the success dialog (`roundNumber` tells devices apart). */
  completed: CompletedRoundInfo | null;
}

export type GuessArtRoomAction =
  | { type: 'start'; players: { id: string; name: string }[]; language: string; manual: boolean }
  | { type: 'selectWord'; payload: SelectWordPayload; language: string }
  | { type: 'submitDrawing'; canvasData: string }
  | { type: 'guess'; guess: string }
  | { type: 'hint'; language: string };

export const initialGuessArtRoom = (hostId: string): GuessArtRoomState => ({
  hostId,
  game: null,
  round: null,
  completed: null,
});

const nowIso = () => new Date().toISOString();

/** A full round for `game.roundNumber`, with the drawer and guesser named. */
function newRound(game: GuessArtGameRecord): GuessArtRound {
  const at = nowIso();
  const drawerIndex = game.currentPlayerIndex;
  const guesser = game.players[(drawerIndex + 1) % game.players.length];
  return {
    ...createEmptyRound(game, false),
    id: `round-${game.roundNumber}`,
    gameId: game.id,
    drawnByName: game.players[drawerIndex]?.name,
    guesserId: guesser?.id,
    guesserName: guesser?.name,
    createdAt: at,
    updatedAt: at,
    completedAt: null,
  } as GuessArtRound;
}

/** Who may act now: the drawer while selecting/drawing, the player after them while guessing. */
export function guessArtActor(state: GuessArtRoomState): string | undefined {
  const { game, round } = state;
  if (!game || !round) return undefined;
  return game.status === 'guessing' ? round.guesserId : round.drawnById;
}

export function guessArtRoomAllows(
  state: GuessArtRoomState,
  action: GuessArtRoomAction,
  from: string,
): boolean {
  if (action.type === 'start') return from === state.hostId && action.players.length >= 2;
  const phase = state.game?.status;
  switch (action.type) {
    case 'selectWord':
      return phase === 'selecting' && guessArtActor(state) === from;
    case 'submitDrawing':
      return phase === 'drawing' && guessArtActor(state) === from;
    default:
      return phase === 'guessing' && guessArtActor(state) === from;
  }
}

export function guessArtRoomReducer(
  state: GuessArtRoomState,
  action: GuessArtRoomAction,
): GuessArtRoomState {
  if (action.type === 'start') {
    if (state.game) return state;
    const at = nowIso();
    const game: GuessArtGameRecord = {
      id: 'live',
      type: 'local',
      status: 'selecting',
      roundNumber: 1,
      createdAt: at,
      updatedAt: at,
      players: action.players.map(({ id, name }) => ({ id, name })),
      currentPlayerIndex: 0,
      options: { language: action.language, manualWordMode: action.manual },
      statistics: { roundsCompleted: 0 },
    };
    return { ...state, game, round: newRound(game) };
  }

  const { game, round } = state;
  if (!game || !round) return state;

  switch (action.type) {
    case 'selectWord': {
      const picked = applyWordSelection(
        game,
        round,
        action.payload,
        action.language || game.options.language,
        DEFAULT_WORDS,
      );
      return { ...state, game: { ...game, status: 'drawing' }, round: picked };
    }
    case 'submitDrawing':
      return {
        ...state,
        game: {
          ...game,
          status: 'guessing',
          currentPlayerIndex: (game.currentPlayerIndex + 1) % game.players.length,
        },
        round: { ...round, status: 'guessing', canvasData: action.canvasData },
      };
    case 'guess': {
      const { correct, round: guessed } = applyGuess(game, round, action.guess, new Date());
      if (!correct) return { ...state, round: guessed };
      const next = advanceAfterCorrectGuess(game);
      return {
        ...state,
        completed: buildCompletedRoundInfo(game, round, action.guess),
        game: next,
        round: newRound(next),
      };
    }
    case 'hint': {
      const result = applyHint(game, round, action.language);
      return result.exhausted ? state : { ...state, round: result.round };
    }
  }
}
