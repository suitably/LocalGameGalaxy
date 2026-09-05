import { useCallback, useEffect, useState } from 'react';
import { LocalGameEngine } from '../logic/engine';
import { mailboxService } from '../logic/mailboxService';
import { gameRelayStorage } from '../../../lib/push/gameRelayStorage';
import { pushClient } from '../../../lib/push/pushClient';
import { storage } from '../../../lib/storage';
import { playerAssignment } from '../logic/playerAssignment';
import { guessArtNotificationService } from '../logic/notificationService';
import { buildTurnNotificationMessage } from '../../../lib/notifications';
import type {
  GameSnapshot,
  GuessArtGameRecord,
  GuessArtRound,
  HintResult,
  PlayerIdentity,
  SelectWordPayload,
} from '../logic/types';

export interface UseGuessArtGameResult {
  game: GuessArtGameRecord | null;
  round: GuessArtRound | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  selectWord: (payload: SelectWordPayload) => Promise<void>;
  submitDrawing: (canvasData: string) => Promise<void>;
  submitGuess: (guess: string) => Promise<{ correct: boolean }>;
  requestHint: () => Promise<{ hint?: HintResult; exhausted?: boolean }>;
  updateGameDetails: (payload: {
    name?: string;
    players?: { id: string; name: string }[];
  }) => Promise<void>;
}

export const useGuessArtGame = (
  gameId: string | null,
  language: string,
): UseGuessArtGameResult => {
  const [game, setGame] = useState<GuessArtGameRecord | null>(null);
  const [round, setRound] = useState<GuessArtRound | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(gameId));
  const [error, setError] = useState<Error | null>(null);

  // 1. Game-Scoped Relay Parsing (Session only, without polluting global storage)
  useEffect(() => {
    if (!gameId || typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const hashParams = new URLSearchParams(hashQuery);
      const relay = hashParams.get('gameRelay') || hashParams.get('relay') || searchParams.get('gameRelay') || searchParams.get('relay');
      if (relay) {
        gameRelayStorage.setGameRelay(gameId, relay);
      }
    } catch {
      // Ignore parse errors
    }
  }, [gameId]);

  const loadSnapshot = useCallback(async () => {
    if (!gameId) {
      setGame(null);
      setRound(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const snapshot = await LocalGameEngine.getGameSnapshot(gameId, language);
      setGame(snapshot.game);
      setRound(snapshot.round);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load game'));
    } finally {
      setLoading(false);
    }
  }, [gameId, language]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // 2. Auto-Register Web Push for active local players in this game
  const localPlayerIdsKey = game
    ? game.players
        .filter((p) => playerAssignment.isPlayerLocal(game.id, p.id, false))
        .map((p) => p.id)
        .join(',')
    : '';

  useEffect(() => {
    if (!localPlayerIdsKey || !gameId) return;
    const ids = localPlayerIdsKey.split(',').filter(Boolean);
    const ownRelay = storage.getPushRelayUrl();
    for (const id of ids) {
      // Never register push subscription on relay for a temporarily claimed player
      if (playerAssignment.isTurnClaimedTemporarily(gameId, id)) {
        continue;
      }
      pushClient.registerForGamePush(gameId, id, ownRelay || undefined);
    }
  }, [localPlayerIdsKey, gameId]);

  // Ensure all local players in this game have their personal ntfyTopic & relayUrl attached to the game record
  useEffect(() => {
    if (!game || !gameId) return;
    const userNtfyTopic = storage.getUserNtfyTopic();
    const ownRelay = storage.getPushRelayUrl();
    const prefMethod = storage.getNotificationMethod();

    const localPlayerIds = playerAssignment.getLocalPlayerIds(gameId);
    const primaryLocalPlayerId = localPlayerIds[0] || (game.players[0] ? game.players[0].id : null);

    let needsUpdate = false;
    const updatedPlayers = game.players.map((p) => {
      if (playerAssignment.isPlayerLocal(gameId, p.id, false)) {
        if (
          p.ntfyTopic &&
          p.ntfyTopic !== userNtfyTopic &&
          !playerAssignment.isTurnClaimedTemporarily(gameId, p.id)
        ) {
          // This player belongs to another device! Purge from local player IDs on this device
          playerAssignment.removeLocalPlayerId(gameId, p.id);
          return p;
        }
        // ONLY attach this device's personal ntfyTopic to the PRIMARY local player.
        // Local pass-and-play guest players sharing this device do NOT inherit host's personal topic.
        const isPrimary = p.id === primaryLocalPlayerId;
        const pTopic = p.ntfyTopic || (isPrimary ? userNtfyTopic : undefined);
        const pRelay = p.relayUrl || (isPrimary ? ownRelay : undefined);
        const pMethod = p.notificationMethod || (isPrimary ? prefMethod : undefined);
        if (p.ntfyTopic !== pTopic || p.relayUrl !== pRelay || p.notificationMethod !== pMethod) {
          needsUpdate = true;
          return { ...p, ntfyTopic: pTopic, relayUrl: pRelay, notificationMethod: pMethod };
        }
      }
      return p;
    });

    if (needsUpdate) {
      LocalGameEngine.updateGameDetails(gameId, { players: updatedPlayers })
        .then((snap) => {
          setGame(snap.game);
          mailboxService.publishTurn(gameId, snap).catch(() => {});
        })
        .catch((e) => console.warn('[useGuessArtGame] Failed to sync local player notification channels:', e));
    }
  }, [game, gameId]);

  // Subscribe to ephemeral mailbox and track active screen game
  useEffect(() => {
    if (!gameId) {
      mailboxService.setActiveScreenGameId(null);
      return;
    }

    mailboxService.syncSubscribedGames([gameId]);
    mailboxService.setActiveScreenGameId(gameId);

    const unsubListener = mailboxService.onRemoteSnapshot(async (remoteSnapshot, snapshotGameId) => {
      if (snapshotGameId === gameId) {
        // Automatically purge any player that has been explicitly claimed by another device (different ntfyTopic),
        // UNLESS the player is currently claimed temporarily on this device!
        const ownTopic = storage.getUserNtfyTopic();
        for (const p of remoteSnapshot.game.players) {
          if (
            p.ntfyTopic &&
            p.ntfyTopic !== ownTopic &&
            !playerAssignment.isTurnClaimedTemporarily(gameId, p.id)
          ) {
            playerAssignment.removeLocalPlayerId(gameId, p.id);
          }
        }
        setGame(remoteSnapshot.game);
        setRound(remoteSnapshot.round);
      }
    });

    // Re-sync from local database when user returns to the tab/app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadSnapshot();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubListener();
      mailboxService.setActiveScreenGameId(null);
    };
  }, [gameId, language, loadSnapshot]);

  const publishSnapshot = useCallback(
    async (snap?: GameSnapshot) => {
      if (!gameId) return;
      try {
        const snapshotToPublish = snap || (await LocalGameEngine.getGameSnapshot(gameId, language));
        await mailboxService.publishTurn(gameId, snapshotToPublish);
      } catch (e) {
        console.warn('[useGuessArtGame] Failed to publish snapshot:', e);
      }
    },
    [gameId, language],
  );

  const sendTurnPush = useCallback(
    async (params: {
      snap: GameSnapshot;
      targetPlayerId: string;
      actionType: 'draw' | 'guess';
      actorName?: string;
    }) => {
      if (!gameId) return;
      const { snap, targetPlayerId, actionType, actorName } = params;

      // Never send push notifications to a local player playing on this device
      if (playerAssignment.isPlayerLocal(gameId, targetPlayerId, false)) {
        console.log(`[useGuessArtGame] Suppressing turn push: player ${targetPlayerId} is local on this device`);
        return;
      }

      const targetPlayer = snap.game?.players.find((p) => p.id === targetPlayerId);
      if (!targetPlayer) {
        console.warn(`[useGuessArtGame] Target player ${targetPlayerId} not found in game snapshot`);
        return;
      }

      // Never send push notifications if the target player's topic matches this device's own topic!
      const ownNtfyTopic = storage.getUserNtfyTopic();
      if (targetPlayer.ntfyTopic && ownNtfyTopic && targetPlayer.ntfyTopic === ownNtfyTopic) {
        console.log(`[useGuessArtGame] Suppressing turn push: targetPlayer ${targetPlayerId} shares this device ntfyTopic`);
        return;
      }

      const localPlayerIds = playerAssignment.getLocalPlayerIds(gameId);
      const senderPlayerId =
        actionType === 'guess'
          ? snap.round?.drawnById || localPlayerIds[0]
          : snap.round?.guesserId || localPlayerIds[0];

      if (senderPlayerId && senderPlayerId === targetPlayerId) {
        console.log(`[useGuessArtGame] Suppressing turn push: sender ${senderPlayerId} is target`);
        return;
      }

      const effectiveRelay = gameRelayStorage.getEffectiveRelay(gameId, targetPlayer.relayUrl);

      const message = buildTurnNotificationMessage({
        gameType: 'guessart',
        gameName: snap.game?.name,
        gameId,
        actionType,
        actorName,
        targetPlayerName: targetPlayer.name,
        targetPlayerId: targetPlayer.id,
        relayUrl: effectiveRelay || undefined,
      });

      console.log(
        `[useGuessArtGame] Dispatching ${actionType} push to ${targetPlayer.name} (${targetPlayer.id}) via topic ${targetPlayer.ntfyTopic || 'auto'} and relay ${effectiveRelay || 'none'}`,
      );

      try {
        await pushClient.sendGamePushNotification({
          gameId,
          senderPlayerId,
          targetPlayerId: targetPlayer.id,
          targetRelayUrl: effectiveRelay || undefined,
          ntfyTopic: targetPlayer.ntfyTopic,
          title: message.title,
          body: message.body,
          url: message.url,
          tag: message.tag,
          icon: message.icon,
          action: actionType,
        });
      } catch (e) {
        console.warn('[useGuessArtGame] Failed to send turn push notification:', e);
      }
    },
    [gameId],
  );

  const selectWord = useCallback(
    async (payload: SelectWordPayload) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.selectWord(gameId, payload, language);
        setGame(result.game);
        setRound(result.round);
        await publishSnapshot(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to select word'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language, publishSnapshot],
  );

  const submitDrawing = useCallback(
    async (canvasData: string) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.submitDrawing(gameId, canvasData, language);
        if (result.round?.id) {
          guessArtNotificationService.markRoundDrawnLocally(result.round.id);
        }
        setGame(result.game);
        setRound(result.round);
        await publishSnapshot(result);

        // If this drawer was claimed temporarily for this turn, release claim and restore to remote!
        const drawerId = result.round?.drawnById || round?.drawnById;
        const wasTemporaryClaim = drawerId
          ? playerAssignment.isTurnClaimedTemporarily(gameId, drawerId) || Boolean(round?.temporaryClaim)
          : Boolean(round?.temporaryClaim);

        if (drawerId && wasTemporaryClaim) {
          playerAssignment.releaseTemporaryClaims(gameId, drawerId);
        }

        // If this turn was completed under a temporary claim ("lass mich hier spielen"),
        // no notifications are sent ("in diesem Fall soll keiner eine Benachrichtigung erhalten").
        if (!wasTemporaryClaim) {
          let guesserId = result.round?.guesserId;
          if (!guesserId && result.game && result.round) {
            const dIdx = result.game.players.findIndex((p) => p.id === result.round?.drawnById);
            const effDIdx = dIdx >= 0 ? dIdx : (Math.max(1, result.round.roundNumber) - 1) % (result.game.players.length || 1);
            guesserId = result.game.players[(effDIdx + 1) % (result.game.players.length || 1)]?.id;
          }
          const drawerName = result.round?.drawnByName;
          if (guesserId) {
            await sendTurnPush({
              snap: result,
              targetPlayerId: guesserId,
              actionType: 'guess',
              actorName: drawerName,
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to submit drawing'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId, language, publishSnapshot, sendTurnPush, round?.drawnById, round?.temporaryClaim],
  );

  const submitGuess = useCallback(
    async (guess: string) => {
      if (!gameId) return { correct: false };
      setLoading(true);
      setError(null);
      try {
        const dIdx = game?.players.findIndex((p) => p.id === round?.drawnById) ?? -1;
        const effDIdx = dIdx >= 0 ? dIdx : (Math.max(1, round?.roundNumber || 1) - 1) % (game?.players.length || 1);
        const activeGuesserId = round?.guesserId || game?.players[(effDIdx + 1) % (game?.players.length || 1)]?.id;
        const isGuesserClaimedTemporarily = activeGuesserId
          ? playerAssignment.isTurnClaimedTemporarily(gameId, activeGuesserId) || Boolean(round?.temporaryClaim)
          : Boolean(round?.temporaryClaim);

        const result = await LocalGameEngine.submitGuess(
          gameId,
          guess,
          language,
          isGuesserClaimedTemporarily,
        );
        setGame(result.game);
        setRound(result.round);
        setLoading(false);

        const snap: GameSnapshot = { game: result.game, round: result.round };
        await publishSnapshot(snap);

        if (result.correct) {
          // Word was correctly guessed! Round is won!
          // Note: A turn consists of guessing, selecting a word, and drawing.
          // Therefore, the temporary claim remains active so the local device can pick a word and draw!
          // The temporary claim will be released when submitDrawing finishes.

          // Notify the next drawer ONLY if this turn is NOT being played locally under a temporary claim!
          // If claimed temporarily, no one should receive a notification.
          const nextDrawerId = result.round?.drawnById;
          const guesserPlayer =
            result.game.players.find((p) => playerAssignment.isPlayerLocal(gameId, p.id, false)) ||
            result.game.players.find((p) => p.id !== nextDrawerId);
          const guesserName = guesserPlayer?.name;

          if (nextDrawerId && !isGuesserClaimedTemporarily) {
            await sendTurnPush({
              snap,
              targetPlayerId: nextDrawerId,
              actionType: 'draw',
              actorName: guesserName,
            });
          }
        }

        return { correct: result.correct };
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to submit guess'));
        throw err;
      }
    },
    [gameId, language, publishSnapshot, sendTurnPush, game?.players, round?.drawnById, round?.guesserId, round?.roundNumber, round?.temporaryClaim],
  );

  const requestHint = useCallback(async () => {
    if (!gameId) return { exhausted: true };
    try {
      const result = await LocalGameEngine.requestHint(gameId, language);
      setGame(result.game);
      setRound(result.round);
      await publishSnapshot({ game: result.game, round: result.round });
      return { hint: result.hint, exhausted: result.exhausted };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to request hint'));
      throw err;
    }
  }, [gameId, language, publishSnapshot]);

  const updateGameDetails = useCallback(
    async (payload: { name?: string; players?: (Partial<PlayerIdentity> & { id: string })[] }) => {
      if (!gameId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await LocalGameEngine.updateGameDetails(gameId, payload, language);
        setGame(result.game);
        setRound(result.round);
        setLoading(false);
        await publishSnapshot(result);
      } catch (err) {
        setLoading(false);
        setError(err instanceof Error ? err : new Error('Failed to update game details'));
        throw err;
      }
    },
    [gameId, language, publishSnapshot],
  );

  return {
    game,
    round,
    loading,
    error,
    refresh: loadSnapshot,
    selectWord,
    submitDrawing,
    submitGuess,
    requestHint,
    updateGameDetails,
  };
};
