/**
 * Keeps this device's seats in a GuessArt game current [ID: HOOK-GUESSART-SEATS]
 *
 * - registers Web Push for the players played here,
 * - converts records from before seats and writes this device's notification channels onto
 *   its players (then persists and publishes),
 * - collects players who joined from another device for a short notice.
 */
import { useCallback, useEffect, useState } from 'react';
import { pushClient } from '../../../lib/push/pushClient';
import { getPushRelayUrl } from '../../../lib/push/pushSettings';
import { refreshOwnSeats } from '../../../modules/player-management';
import { localNotificationPresenter } from '../../../lib/notifications';
import i18n from '../../../i18n';
import { LocalGameEngine } from '../logic/engine';
import { guessArtMailbox } from '../logic/guessArtMailbox';
import { playerAssignment } from '../logic/playerAssignment';
import type { GameSnapshot, GuessArtGameRecord, PlayerIdentity } from '../logic/types';

export function useGuessArtSeats(
  game: GuessArtGameRecord | null,
  onSeatsSaved: (snap: GameSnapshot) => void,
) {
  const [joinedNames, setJoinedNames] = useState<string[]>([]);
  const gameId = game?.id ?? null;

  const ownPlayerIds = game
    ? playerAssignment
        .localPlayerIds(game)
        // A turn borrowed with "play here" does not get push subscriptions on this device.
        .filter((id) => !playerAssignment.isTurnClaimedTemporarily(game.id, id))
        .join(',')
    : '';

  useEffect(() => {
    if (!gameId || !ownPlayerIds) return;
    const relay = getPushRelayUrl() || undefined;
    for (const id of ownPlayerIds.split(',')) {
      pushClient.registerForGamePush(gameId, id, relay);
    }
  }, [gameId, ownPlayerIds]);

  useEffect(() => {
    if (!game) return;
    const { players, changed } = refreshOwnSeats(
      game.players,
      playerAssignment.legacyLocalIds(game),
    );
    if (!changed) return;
    LocalGameEngine.updateGameDetails(game.id, { players })
      .then((snap) => {
        onSeatsSaved(snap);
        guessArtMailbox.publish(game.id, snap).catch(() => {});
      })
      .catch((e) => console.warn('[GuessArt] Failed to save own seats:', e));
  }, [game, onSeatsSaved]);

  const noteJoined = useCallback(
    (players: PlayerIdentity[] | undefined) => {
      if (!players?.length) return;
      const names = players.map((p) => p.name);
      setJoinedNames((prev) => [...prev, ...names]);
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        localNotificationPresenter
          .showNotification({
            title: game?.name || 'GuessArt',
            body: i18n.t('common.playerJoined', { names: names.join(', ') }),
            tag: `guessart-joined-${gameId}`,
          })
          .catch(() => {});
      }
    },
    [game?.name, gameId],
  );

  const clearJoined = useCallback(() => setJoinedNames([]), []);

  return { joinedNames, noteJoined, clearJoined };
}
