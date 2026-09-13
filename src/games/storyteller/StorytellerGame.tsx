import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useHeaderLayout } from '../../context/HeaderLayoutContext';
import { useStorytellerLobby } from './hooks/useStorytellerLobby';
import { StoryLobby } from './components/StoryLobby';
import { StoryHeader } from './components/StoryHeader';
import { StoryWriterView } from './components/StoryWriterView';
import { WaitingForStoryTurnView } from './components/WaitingForStoryTurnView';
import { StoryReaderModal } from './components/StoryReaderModal';
import { EditStoryDialog } from './components/EditStoryDialog';
import { ShareStoryLinksDialog } from './components/ShareStoryLinksDialog';
import { useGameJoinUrl } from '../../modules/sharing';
import { playerAssignment } from './logic/playerAssignment';
import { LocalStoryEngine } from './logic/engine';
import { storytellerNotificationService } from './logic/notificationService';
import { updateStoryGame } from './logic/repository';
import { storytellerMailboxService, type StorytellerSyncMessage } from './logic/mailboxService';
import { useMultiChannelSync } from '../../modules/sync';
import { gameRelayStorage } from '../../lib/push/gameRelayStorage';
import { pushClient } from '../../lib/push/pushClient';
import { storage } from '../../lib/storage';
import { buildTurnNotificationMessage } from '../../lib/notifications';
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
  const { setHeaderHidden } = useHeaderLayout();

  useEffect(() => {
    setHeaderHidden(isGameActive);
    return () => setHeaderHidden(false);
  }, [isGameActive, setHeaderHidden]);

  // Request browser notification permission on mount
  useEffect(() => {
    storytellerNotificationService.requestPermission().catch(() => {});
  }, []);

  // Process URL parameters: gameId, player, data, gameRelay
  useGameJoinUrl<StoryGameSnapshot>({
    defaultHashPath: '#/games/storyteller',
    onSnapshotLoaded: async (snapshot, params) => {
      if (!snapshot || !snapshot.game) return;
      const targetPlayerId = params.get('player') || params.get('playerId');
      const relayParam = params.get('gameRelay');

      const imported = await LocalStoryEngine.importSnapshot(snapshot);
      const resolvedGameId = imported.game.id;

      if (targetPlayerId) {
        const ownRelay = storage.getPushRelayUrl();
        const prefMethod = storage.getNotificationMethod();
        const updatedPlayers: StoryPlayer[] = imported.game.players.map((p) =>
          p.id === targetPlayerId
            ? {
                ...p,
                relayUrl: ownRelay || p.relayUrl || relayParam || undefined,
                notificationMethod: prefMethod,
                ntfyTopic: storage.getUserNtfyTopic() || p.ntfyTopic,
              }
            : p,
        );
        imported.game.players = updatedPlayers;
        await updateStoryGame(imported.game.id, { players: updatedPlayers }).catch(() => {});
        storytellerMailboxService.publish(imported.game.id, {
          type: 'STORY_SYNC',
          snapshot: { game: { ...imported.game, players: updatedPlayers }, entries: imported.entries },
        });
      }

      setGame(imported.game);
      setEntries(imported.entries);

      if (targetPlayerId) {
        playerAssignment.addLocalPlayerId(resolvedGameId, targetPlayerId);
        const ownRelay = storage.getPushRelayUrl();
        const preferredRelay = ownRelay || relayParam || undefined;
        pushClient.registerForGamePush(resolvedGameId, targetPlayerId, preferredRelay).catch(() => {});
      }
      if (relayParam) {
        gameRelayStorage.setGameRelay(resolvedGameId, relayParam);
      }
      setLocalVersion((v) => v + 1);
      await loadActiveGames();
      setActiveGameId(resolvedGameId);
    },
    onDirectGameId: async (urlGameId, params) => {
      const targetPlayerId = params.get('player') || params.get('playerId');
      const relayParam = params.get('gameRelay');

      if (targetPlayerId) {
        playerAssignment.addLocalPlayerId(urlGameId, targetPlayerId);
        const ownRelay = storage.getPushRelayUrl();
        const preferredRelay = ownRelay || relayParam || undefined;
        pushClient.registerForGamePush(urlGameId, targetPlayerId, preferredRelay).catch(() => {});
      }
      if (relayParam) {
        gameRelayStorage.setGameRelay(urlGameId, relayParam);
      }
      setLocalVersion((v) => v + 1);
      await loadActiveGames();
      setActiveGameId(urlGameId);
    },
  });

  const handleBack = useCallback(() => {
    setActiveGameId(null);
    setGame(null);
    setEntries([]);
    loadActiveGames();
    navigate('/games/storyteller');
  }, [loadActiveGames, navigate]);

  // Realtime BroadcastChannel & MQTT sync
  const { publish } = useMultiChannelSync<StorytellerSyncMessage>({
    channelId: activeGameId,
    broadcastPrefix: 'storyteller_channel',
    mailbox: storytellerMailboxService,
    onMessage: async (msg, source) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'STORY_SYNC' && msg.snapshot) {
        const res = await LocalStoryEngine.importSnapshot(msg.snapshot);
        if (res.updated) {
          setGame(res.game);
          setEntries(res.entries);

          // Notify if it is now this device's turn and window is hidden
          if (source === 'mqtt') {
            const nextActive = res.game.players[res.game.currentPlayerIndex];
            if (nextActive && playerAssignment.isPlayerLocal(res.game.id, nextActive.id, false)) {
              if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                const lastAuthor = res.entries[res.entries.length - 1]?.authorName;
                const turnMsg = buildTurnNotificationMessage({
                  gameType: 'storyteller',
                  gameName: res.game.name,
                  gameId: res.game.id,
                  actionType: 'turn',
                  actorName: lastAuthor,
                  targetPlayerName: nextActive.name,
                  targetPlayerId: nextActive.id,
                });
                storytellerNotificationService.showLocalNotification(turnMsg.title, turnMsg.body, turnMsg.url);
              }
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
    },
  });

  // Broadcast state & events over BroadcastChannel & MQTT Mailbox
  const broadcastSnapshot = useCallback((newGame: StoryGameRecord, newEntries: StoryEntry[]) => {
    const snapshot: StoryGameSnapshot = { game: newGame, entries: newEntries };
    setGame(newGame);
    setEntries(newEntries);
    setActiveGameId(newGame.id);

    publish({ type: 'STORY_SYNC', snapshot }, newGame.id);
  }, [publish]);

  // Ensure local players have their personal ntfyTopic & relayUrl attached to the story record
  useEffect(() => {
    if (!game || !activeGameId) return;
    const userNtfyTopic = storage.getUserNtfyTopic();
    const ownRelay = storage.getPushRelayUrl();
    const prefMethod = storage.getNotificationMethod();

    const localPlayerIds = playerAssignment.getLocalPlayerIds(activeGameId);
    const primaryLocalPlayerId = localPlayerIds[0] || (game.players[0] ? game.players[0].id : null);

    let needsUpdate = false;
    const updatedPlayers = game.players.map((p) => {
      if (playerAssignment.isPlayerLocal(activeGameId, p.id, false)) {
        if (p.ntfyTopic && p.ntfyTopic !== userNtfyTopic) {
          playerAssignment.removeLocalPlayerId(activeGameId, p.id);
          return p;
        }
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
      LocalStoryEngine.updateGameDetails(activeGameId, { players: updatedPlayers })
        .then((snap) => {
          setGame(snap.game);
          storytellerMailboxService.publish(activeGameId, {
            type: 'STORY_SYNC',
            snapshot: { game: snap.game, entries },
          });
        })
        .catch((e) => console.warn('[StorytellerGame] Failed to sync local player notification channels:', e));
    }
  }, [game, activeGameId, entries]);

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

      // Web Push to next player if configured and not local
      const nextPlayer = snap.game.players[snap.game.currentPlayerIndex];
      const author = snap.entries[snap.entries.length - 1]?.authorName;
      if (nextPlayer && !playerAssignment.isPlayerLocal(snap.game.id, nextPlayer.id, false)) {
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

      publish({ type: 'STORY_FINISH', snapshot: snap }, game.id);

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
