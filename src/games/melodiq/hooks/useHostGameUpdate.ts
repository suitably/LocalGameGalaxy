import { useCallback, useRef } from 'react';
import { type PassiveGameState } from '../types';

interface GameStateBroadcaster {
  broadcast: (message: unknown) => void;
}

/** Forwards game state to the TV and (throttled to 50 ms) broadcasts it to connected phones. */
export function useHostGameUpdate(
  sendGameUpdate: (state: PassiveGameState) => void,
  manager: GameStateBroadcaster | null,
  isClient: boolean,
) {
  const lastGameUpdateRef = useRef<number>(0);
  return useCallback(
    (state: PassiveGameState) => {
      sendGameUpdate(state);
      if (manager && !isClient) {
        const now = Date.now();
        if (now - lastGameUpdateRef.current > 50) {
          manager.broadcast({ type: 'game_state_update', state: { ...state, hostTimestamp: now } });
          lastGameUpdateRef.current = now;
        }
      }
    },
    [sendGameUpdate, manager, isClient],
  );
}
