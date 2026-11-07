import { useCallback, useEffect, useState } from 'react';
import { useRoomReducer } from '../../../modules/room-game';
import { usePartyRoomPlayers } from '../../../features/party/hooks/usePartyRoomPlayers';
import {
  guessArtActor,
  guessArtRoomAllows,
  guessArtRoomReducer,
  initialGuessArtRoom,
  type GuessArtRoomAction,
  type GuessArtRoomState,
} from '../logic/guessartRoom';
import { applyGuess, applyHint } from '../logic/transitions';
import type { HintResult, SelectWordPayload } from '../logic/types';

/**
 * GuessArt live in a party room [ID: HOOK-GUESSART-ROOM]: the party host runs the shared game
 * (`guessartRoom.ts`), everyone sends their own moves; the roster is the room's players.
 */
export function useGuessArtRoom(roomId: string, language: string, manualWordMode: boolean) {
  const room = usePartyRoomPlayers(roomId);
  const [initialState] = useState<GuessArtRoomState>(() =>
    initialGuessArtRoom(room.isHost ? room.myId : ''),
  );
  const { state, dispatch, synced } = useRoomReducer<GuessArtRoomState, GuessArtRoomAction>({
    gameKey: 'guessart',
    roomId,
    playerId: room.myId,
    isHost: room.isHost,
    reducer: guessArtRoomReducer,
    authorize: guessArtRoomAllows,
    initialState,
  });

  // The host deals the game once at least two players are in the room.
  const roster = room.players;
  useEffect(() => {
    if (!room.isHost || state.game || roster.length < 2) return;
    dispatch({
      type: 'start',
      players: roster.map((p) => ({ id: p.id, name: p.name })),
      language,
      manual: manualWordMode,
    });
  }, [room.isHost, state.game, roster, language, manualWordMode, dispatch]);

  const { game, round } = state;
  const actor = guessArtActor(state);
  const myTurn = actor === room.myId;

  const selectWord = useCallback(
    async (payload: SelectWordPayload) => dispatch({ type: 'selectWord', payload, language }),
    [dispatch, language],
  );
  const submitDrawing = useCallback(
    async (canvasData: string) => dispatch({ type: 'submitDrawing', canvasData }),
    [dispatch],
  );
  const submitGuess = useCallback(
    async (guess: string) => {
      if (!game || !round || game.status !== 'guessing') return { correct: false };
      const { correct } = applyGuess(game, round, guess, new Date());
      dispatch({ type: 'guess', guess });
      return { correct };
    },
    [dispatch, game, round],
  );
  const requestHint = useCallback(async (): Promise<{
    hint?: HintResult;
    exhausted?: boolean;
  }> => {
    if (!game || !round || game.status !== 'guessing') return { exhausted: true };
    const result = applyHint(game, round, language);
    if (result.exhausted) return { exhausted: true };
    dispatch({ type: 'hint', language });
    return { hint: result.hint };
  }, [dispatch, game, round, language]);

  return {
    ...room,
    state,
    synced,
    isDrawer: myTurn && game?.status !== 'guessing',
    isGuesser: myTurn && game?.status === 'guessing',
    selectWord,
    submitDrawing,
    submitGuess,
    requestHint,
  };
}
