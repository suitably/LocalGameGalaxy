/**
 * Pass-and-play cover for games that move the turn on themselves [ID: MOD-PASS-AND-PLAY-TURN]
 *
 * When the game's current player changes (Kniffel after scoring, Knister after placing), the
 * screen is covered for the new player until they tap. `acknowledge` marks a switch made on
 * purpose (tapping another player's tab) so no cover appears for it.
 */
import { useCallback, useReducer, useState } from 'react';
import { handoverReducer, type HandoverPlayer } from './handover';

export function useTurnHandover(
  players: HandoverPlayer[],
  currentId: string | null | undefined,
  /** Called when someone other than the game's current player reveals the screen. */
  onActivate: (playerId: string) => void,
) {
  const [state, dispatch] = useReducer(handoverReducer, { phase: 'playing' });
  const [seenId, setSeenId] = useState(currentId);
  // Adjust state while rendering (no effect): the turn moved on since the last render.
  if (seenId !== currentId) {
    setSeenId(currentId);
    if (players.length > 1 && currentId) dispatch({ type: 'COVER', playerId: currentId });
  }

  const reveal = useCallback(() => {
    if (state.phase === 'covered') {
      setSeenId(state.playerId);
      if (state.playerId !== currentId) onActivate(state.playerId);
    }
    dispatch({ type: 'REVEAL' });
  }, [state, currentId, onActivate]);
  const retarget = useCallback((playerId: string) => dispatch({ type: 'RETARGET', playerId }), []);
  const acknowledge = useCallback((playerId: string) => setSeenId(playerId), []);

  return {
    coveredFor:
      state.phase === 'covered' ? (players.find((p) => p.id === state.playerId) ?? null) : null,
    reveal,
    retarget,
    acknowledge,
  };
}
