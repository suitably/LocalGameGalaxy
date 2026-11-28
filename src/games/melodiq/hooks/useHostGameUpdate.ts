import { useCallback, useEffect, useRef } from 'react';
import { type PassiveGameState } from '../types';
import { withHostLyricsSettings } from '../logic/hostLyricsSettings';
import {
  createStateStream,
  PHONE_STATE_INTERVAL_MS,
  TV_STATE_INTERVAL_MS,
} from '../logic/hostStateStream';
import { useMelodiqSettings } from './settingsContextCore';

interface GameStateBroadcaster {
  broadcast: (message: unknown) => void;
}

/**
 * One host playback report. The scoring loop reports every frame; `getPlayers` builds the
 * player list only when a stream actually sends.
 */
export type HostStateUpdate = Partial<PassiveGameState> & {
  getPlayers?: () => PassiveGameState['players'];
};

/**
 * The host's game state publisher: throttles the playback reports to the TV (~30/s, with the
 * host's lyrics display settings) and to the phones (~20/s), sung segments as deltas
 * (`logic/hostStateStream.ts`). `sendTvState` delivers to the TV unchanged.
 */
export function useHostGameUpdate(
  sendTvState: (state: PassiveGameState) => void,
  manager: GameStateBroadcaster | null,
  isClient: boolean,
) {
  const { settings } = useMelodiqSettings();
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });
  const tvStream = useRef(createStateStream(TV_STATE_INTERVAL_MS));
  const phoneStream = useRef(createStateStream(PHONE_STATE_INTERVAL_MS));

  return useCallback(
    (update: HostStateUpdate) => {
      const now = Date.now();
      let built: PassiveGameState | null = null;
      const build = (): PassiveGameState => {
        if (!built) {
          const { getPlayers, ...rest } = update;
          built = { ...rest, players: rest.players ?? getPlayers?.() ?? [] } as PassiveGameState;
        }
        return built;
      };

      const tv = tvStream.current.next(update.isPlaying, now, () =>
        withHostLyricsSettings(build(), settingsRef.current),
      );
      if (tv) sendTvState(tv);

      if (manager && !isClient) {
        const phones = phoneStream.current.next(update.isPlaying, now, build);
        if (phones) {
          manager.broadcast({
            type: 'game_state_update',
            state: { ...phones, hostTimestamp: now },
          });
        }
      }
    },
    [sendTvState, manager, isClient],
  );
}
