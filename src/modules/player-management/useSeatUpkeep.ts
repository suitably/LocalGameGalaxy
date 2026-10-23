/**
 * Keeps this device's seats in an async game current [ID: MOD-PLAYER-SEAT-UPKEEP]
 *
 * - registers Web Push for the players played here (`pushPlayerIds`) and subscribes this device
 *   with the site's sender when notifications are allowed (`siteWebPush.ts`),
 * - converts records from before seats (`legacyLocalIds`) and writes this device's
 *   notification channels onto its players, then calls `persist` (save + publish),
 * - collects players who joined from another device (`noteJoined`) for a short notice,
 *   also as a system notification while the app is in the background.
 */
import { useCallback, useEffect, useState } from 'react';
import i18n from '../../i18n';
import { localNotificationPresenter } from '../../lib/notifications';
import { pushClient } from '../../lib/push/pushClient';
import { getPushRelayUrl } from '../../lib/push/pushSettings';
import { ensureSiteWebPush, onSiteSubscription } from '../../lib/push/siteWebPush';
import { refreshOwnSeats } from './seatActions';
import type { SeatedPlayer } from './playerSeats';

export function useSeatUpkeep<P extends SeatedPlayer>({
  game,
  pushPlayerIds,
  legacyLocalIds,
  persist,
}: {
  game: { id: string; name?: string; players: P[] } | null;
  pushPlayerIds: string[];
  legacyLocalIds: string[];
  persist: (players: P[]) => Promise<void>;
}) {
  const [joinedNames, setJoinedNames] = useState<string[]>([]);
  // Bumped when this device gets a (new) push subscription, so its seats carry it.
  const [pushEndpoint, setPushEndpoint] = useState<string | null>(null);
  const gameId = game?.id ?? null;
  const pushKey = pushPlayerIds.join(',');
  const legacyKey = legacyLocalIds.join(',');

  useEffect(() => {
    if (!gameId || !pushKey) return;
    const relay = getPushRelayUrl() || undefined;
    for (const id of pushKey.split(',')) pushClient.registerForGamePush(gameId, id, relay);
  }, [gameId, pushKey]);

  useEffect(() => {
    const off = onSiteSubscription((sub) => setPushEndpoint(sub.endpoint));
    if (gameId) ensureSiteWebPush().catch(() => {});
    return off;
  }, [gameId]);

  useEffect(() => {
    if (!game) return;
    const { players, changed } = refreshOwnSeats(
      game.players,
      legacyKey ? legacyKey.split(',') : [],
    );
    if (changed)
      persist(players).catch((e) => console.warn('[seats] Failed to save own seats:', e));
  }, [game, legacyKey, persist, pushEndpoint]);

  const gameName = game?.name;
  const noteJoined = useCallback(
    (players: SeatedPlayer[] | undefined) => {
      if (!players?.length) return;
      const names = players.map((p) => p.name || '?');
      setJoinedNames((prev) => [...prev, ...names]);
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        localNotificationPresenter
          .showNotification({
            title: gameName || 'Nexumia',
            body: i18n.t('common.playerJoined', { names: names.join(', ') }),
            tag: `joined-${gameId}`,
          })
          .catch(() => {});
      }
    },
    [gameName, gameId],
  );

  const clearJoined = useCallback(() => setJoinedNames([]), []);
  return { joinedNames, noteJoined, clearJoined };
}
