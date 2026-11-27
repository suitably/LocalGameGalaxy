import { useCallback, useEffect, useRef } from 'react';
import { type PassiveGameState } from '../types';
import { withHostLyricsSettings } from '../logic/hostLyricsSettings';
import { useMelodiqSettings } from './settingsContextCore';

interface GameStateBroadcaster {
  broadcast: (message: unknown) => void;
}

/**
 * Forwards game state to the TV and (throttled to 50 ms) broadcasts it to connected phones.
 * The TV state carries the host's lyrics display settings, so a passive TV always shows what the
 * host (or an admin phone via host settings) chose; phones keep their own lyrics settings.
 */
export function useHostGameUpdate(
  sendGameUpdate: (state: PassiveGameState) => void,
  manager: GameStateBroadcaster | null,
  isClient: boolean,
) {
  const { settings } = useMelodiqSettings();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });
  const lastGameUpdateRef = useRef<number>(0);
  return useCallback(
    (state: PassiveGameState) => {
      sendGameUpdate(withHostLyricsSettings(state, settingsRef.current));
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
