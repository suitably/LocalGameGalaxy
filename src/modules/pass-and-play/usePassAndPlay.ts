/**
 * Pass-and-play handover state for one device [ID: MOD-PASS-AND-PLAY-HOOK]
 */
import { useCallback, useReducer } from 'react';
import { handoverReducer, type HandoverPlayer } from './handover';

export function usePassAndPlay(
  players: HandoverPlayer[],
  currentId: string | null | undefined,
  /** Called when the chosen player reveals the screen. */
  onActivate: (playerId: string) => void,
) {
  const [state, dispatch] = useReducer(handoverReducer, { phase: 'playing' });

  const startSwitch = useCallback(
    () => dispatch({ type: 'START', players, currentId }),
    [players, currentId],
  );
  const retarget = useCallback((playerId: string) => dispatch({ type: 'RETARGET', playerId }), []);
  const cancel = useCallback(() => dispatch({ type: 'CANCEL' }), []);
  const reveal = useCallback(() => {
    if (state.phase === 'covered') onActivate(state.playerId);
    dispatch({ type: 'REVEAL' });
  }, [state, onActivate]);

  return {
    covered: state.phase === 'covered',
    coveredFor:
      state.phase === 'covered' ? (players.find((p) => p.id === state.playerId) ?? null) : null,
    startSwitch,
    retarget,
    reveal,
    cancel,
  };
}
