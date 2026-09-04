import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LZString from 'lz-string';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useLayout } from '../../context/LayoutContext';
import { useStorytellerLobby } from './hooks/useStorytellerLobby';
import { StoryLobby } from './components/StoryLobby';
import { StoryHeader } from './components/StoryHeader';
import { StoryWriterView } from './components/StoryWriterView';
import { WaitingForStoryTurnView } from './components/WaitingForStoryTurnView';
import { StoryReaderModal } from './components/StoryReaderModal';
import { EditStoryDialog } from './components/EditStoryDialog';
import { ShareStoryLinksDialog } from './components/ShareStoryLinksDialog';
import { playerAssignment } from './logic/playerAssignment';
import { LocalStoryEngine } from './logic/engine';
import { storytellerNotificationService } from './logic/notificationService';
import { updateStoryGame } from './logic/repository';
import { storytellerMailboxService } from './logic/mailboxService';
import { gameRelayStorage } from '../../lib/push/gameRelayStorage';
import { pushClient } from '../../lib/push/pushClient';
import { storage } from '../../lib/storage';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot, StoryPlayer } from './types';

export const StorytellerGame: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle(t('games.storyteller.title', 'Geschichtenschreiber'));

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [game, setGame] = useState<StoryGameRecord | null>(null);
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [gameLoading, setGameLoading] = useState<boolean>(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);

  const {
    lobbyPlayers,
    modifiers,
    activeGames,
    addPlayer,
    removePlayer,
    updateModifier,
    createGame,
    deleteGame,
    loadActiveGames,
  } = useStorytellerLobby();

  const isGameActive = Boolean(activeGameId || game);
  useWakeLock(isGameActive);
  const { setHeaderHidden } = useLayout();

  useEffect(() => {
    setHeaderHidden(isGameActive);
    return () => setHeaderHidden(false);
  }, [isGameActive, setHeaderHidden]);

  // Request browser notification permission on mount
  useEffect(() => {
    storytellerNotificationService.requestPermission().catch(() => {});
  }, []);

  const cleanUrl = useCallback(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    const hashWithoutQuery = window.location.hash.split('?')[0] || '#/games/storyteller';
    const cleanPath = window.location.pathname + hashWithoutQuery;
    window.history.replaceState({}, document.title, cleanPath);
  }, []);

  // Process URL parameters: gameId, player, data, gameRelay
  useEffect(() => {
    const processUrlParams = async () => {
      if (typeof window === 'undefined') return;
      const search = window.location.search;
      const hash = window.location.hash;
      const queryString = search || (hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
      if (!queryString) return;

      const params = new URLSearchParams(queryString);
      const dataParam = params.get('data');
      const targetPlayerId = params.get('player') || params.get('playerId');
      const urlGameId = params.get('gameId') || params.get('game');
      const relayParam = params.get('gameRelay');

      let resolvedGameId = urlGameId;

      if (dataParam) {
        try {
          const jsonStr = LZString.decompressFromEncodedURIComponent(dataParam);
          if (jsonStr) {
            const snapshot = JSON.parse(jsonStr) as StoryGameSnapshot;
            if (snapshot && snapshot.game) {
              const imported = await LocalStoryEngine.importSnapshot(snapshot);
              resolvedGameId = imported.game.id;

              if (targetPlayerId) {
                const ownRelay = storage.getPushRelayUrl();
                const prefMethod = storage.getNotificationMethod();
                const updatedPlayers: StoryPlayer[] = imported.game.players.map((p) =>
                  p.id === targetPlayerId
                    ? {
                        ...p,
                        relayUrl: ownRelay || p.relayUrl || relayParam || undefined,
                        notificationMethod: prefMethod,
                        ntfyTopic: p.ntfyTopic || pushClient.getNtfyTopic(imported.game.id, targetPlayerId),
                      }
                    : p,
                );
                imported.game.players = updatedPlayers;
                await updateStoryGame(imported.game.id, { players: updatedPlayers }).catch(() => {});
              }

              setGame(imported.game);
              setEntries(imported.entries);
            }
          }
        } catch (e) {
          console.warn('[Storyteller] Failed to unpack URL data payload:', e);
        }
      }

      if (resolvedGameId) {
        if (targetPlayerId) {
          playerAssignment.setLocalPlayerIds(resolvedGameId, [targetPlayerId]);
        }
        if (relayParam) {
          gameRelayStorage.setGameRelay(resolvedGameId, relayParam);
        }
        if (targetPlayerId) {
          const ownRelay = storage.getPushRelayUrl();
          const preferredRelay = ownRelay || relayParam || undefined;
          pushClient.registerForGamePush(resolvedGameId, targetPlayerId, preferredRelay).catch(() => {});
        }
        setLocalVersion((v) => v + 1);
        await loadActiveGames();
        setActiveGameId(resolvedGameId);
        cleanUrl();
      }
    };

    processUrlParams();
    window.addEventListener('hashchange', processUrlParams);
    return () => window.removeEventListener('hashchange', processUrlParams);
  }, [cleanUrl, loadActiveGames]);

  const handleBack = useCallback(() => {
    setActiveGameId(null);
    setGame(null);
    setEntries([]);
    loadActiveGames();
    navigate('/games/storyteller');
  }, [loadActiveGames, navigate]);

  // Broadcast state & events over BroadcastChannel & MQTT Mailbox
  const broadcastSnapshot = useCallback((newGame: StoryGameRecord, newEntries: StoryEntry[]) => {
    const snapshot: StoryGameSnapshot = { game: newGame, entries: newEntries };
    setGame(newGame);
    setEntries(newEntries);
    setActiveGameId(newGame.id);

    try {
      const channel = new BroadcastChannel(`storyteller_channel_${newGame.id}`);
      channel.postMessage({ type: 'STORY_SYNC', snapshot });
      channel.close();
    } catch {
      // ignore
    }

    try {
      storytellerMailboxService.publish(newGame.id, { type: 'STORY_SYNC', snapshot });
    } catch {
      // ignore
    }
  }, []);

  // Realtime BroadcastChannel & MQTT sync
  useEffect(() => {
    if (!activeGameId) return;

    const channel = new BroadcastChannel(`storyteller_channel_${activeGameId}`);

    channel.onmessage = async (event) => {
      if (event.data?.type === 'STORY_SYNC' && event.data.snapshot) {
        const res = await LocalStoryEngine.importSnapshot(event.data.snapshot);
        if (res.updated) {
          setGame(res.game);
          setEntries(res.entries);
        }
      } else if (event.data?.type === 'STORY_FINISH') {
        if (event.data.snapshot) {
          const res = await LocalStoryEngine.importSnapshot(event.data.snapshot);
          if (res.updated) {
            setGame(res.game);
            setEntries(res.entries);
          }
        }
        setReaderOpen(true);
      }
    };

    const unsub = storytellerMailboxService.subscribe(activeGameId, async (msg) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'STORY_SYNC' && msg.snapshot) {
        const res = await LocalStoryEngine.importSnapshot(msg.snapshot);
        if (res.updated) {
          setGame(res.game);
          setEntries(res.entries);

          // Notify if it is now this device's turn and window is hidden
          const nextActive = res.game.players[res.game.currentPlayerIndex];
          if (nextActive && playerAssignment.isPlayerLocal(res.game.id, nextActive.id, false)) {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
              storytellerNotificationService.showLocalNotification(
                `${res.game.name || 'Geschichtenschreiber'}: Du bist dran!`,
                'Ein neuer Abschnitt wurde verfasst. Jetzt bist du an der Reihe!',
              );
            }
          }
        }
      } else if (msg.type === 'STORY_FINISH') {
        if (msg.snapshot) {
          const res = await LocalStoryEngine.importSnapshot(msg.snapshot);
          if (res.updated) {
            setGame(res.game);
            setEntries(res.entries);
          }
        }
        setReaderOpen(true);
      }
    });

    return () => {
      channel.close();
      unsub();
    };
  }, [activeGameId]);

  const handleStartGame = async (options: {
    name?: string;
    language: string;
    modifiers: typeof modifiers;
  }) => {
    setGameLoading(true);
    try {
      const record = await createGame(options);
      broadcastSnapshot(record, []);
    } finally {
      setGameLoading(false);
    }
  };

  const handleResumeGame = async (id: string) => {
    setGameLoading(true);
    try {
      const snap = await LocalStoryEngine.getGameSnapshot(id);
      broadcastSnapshot(snap.game, snap.entries);
    } finally {
      setGameLoading(false);
    }
  };

  const handleSubmitTurn = async (text: string, timeSpentSeconds?: number) => {
    if (!game) return;
    setGameLoading(true);
    try {
      const snap = await LocalStoryEngine.submitTurn(game.id, { text, timeSpentSeconds });
      broadcastSnapshot(snap.game, snap.entries);

      // Web Push to next player if configured
      const nextPlayer = snap.game.players[snap.game.currentPlayerIndex];
      const author = snap.entries[snap.entries.length - 1]?.authorName;
      if (nextPlayer) {
        storytellerNotificationService.dispatchTurnPush({
          game: snap.game,
          nextPlayer,
          authorName: author,
        }).catch(() => {});
      }
    } finally {
      setGameLoading(false);
    }
  };

  const handleFinishStory = async () => {
    if (!game) return;
    setGameLoading(true);
    try {
      const snap = await LocalStoryEngine.finishStory(game.id);
      broadcastSnapshot(snap.game, snap.entries);

      try {
        const channel = new BroadcastChannel(`storyteller_channel_${game.id}`);
        channel.postMessage({ type: 'STORY_FINISH', snapshot: snap });
        channel.close();
      } catch {
        // ignore
      }
      try {
        storytellerMailboxService.publish(game.id, { type: 'STORY_FINISH', snapshot: snap });
      } catch {
        // ignore
      }

      setReaderOpen(true);
    } finally {
      setGameLoading(false);
    }
  };

  const activePlayer = game?.players[game.currentPlayerIndex];

  const isCurrentTurnLocal = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    localVersion;
    if (!game || !activePlayer) return true;
    return playerAssignment.isPlayerLocal(game.id, activePlayer.id, true);
  }, [game, activePlayer, localVersion]);

  const handleToggleLocalRemote = useCallback(async () => {
    if (!game || !activePlayer) return;
    if (isCurrentTurnLocal) {
      playerAssignment.removeLocalPlayerId(game.id, activePlayer.id);
    } else {
      playerAssignment.addLocalPlayerId(game.id, activePlayer.id);
    }
    setLocalVersion((v) => v + 1);
  }, [game, activePlayer, isCurrentTurnLocal]);

  if (!game) {
    return (
      <Box sx={{ width: '100%', height: '100%', overflowY: 'auto' }}>
        <StoryLobby
          players={lobbyPlayers}
          modifiers={modifiers}
          activeGames={activeGames}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onUpdateModifier={updateModifier}
          onStartGame={handleStartGame}
          onResumeGame={handleResumeGame}
          onDeleteGame={deleteGame}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <StoryHeader
        game={game}
        onExit={handleBack}
        onOpenReader={() => setReaderOpen(true)}
        onOpenEdit={() => setEditOpen(true)}
        onOpenShare={() => setShareDialogOpen(true)}
        isCurrentTurnLocal={isCurrentTurnLocal}
        canToggleLocalRemote={true}
        onToggleLocalRemote={handleToggleLocalRemote}
      />

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {gameLoading && !game ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : !isCurrentTurnLocal ? (
          <WaitingForStoryTurnView
            game={game}
            onClaimPlayer={(playerId) => {
              playerAssignment.addLocalPlayerId(game.id, playerId);
              setLocalVersion((v) => v + 1);
            }}
            onShareTurn={() => setShareDialogOpen(true)}
            onOpenShare={() => setShareDialogOpen(true)}
            onOpenReader={() => setReaderOpen(true)}
          />
        ) : (
          <StoryWriterView
            game={game}
            entries={entries}
            onSubmitTurn={handleSubmitTurn}
            onFinishStory={handleFinishStory}
            loading={gameLoading}
          />
        )}
      </Box>

      <StoryReaderModal
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        game={game}
        entries={entries}
      />

      <EditStoryDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        game={game}
        onSave={async (payload) => {
          const updated = await LocalStoryEngine.updateGameDetails(game.id, payload);
          broadcastSnapshot(updated.game, updated.entries);
        }}
      />

      <ShareStoryLinksDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        game={game}
        entries={entries}
        onPlayerChanged={() => setLocalVersion((v) => v + 1)}
      />
    </Box>
  );
};
