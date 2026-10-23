import React, { useState, useEffect, useCallback } from 'react';
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
import { LocalStoryEngine } from './logic/engine';
import { storytellerNotificationService } from './logic/notificationService';
import { storytellerMailboxService, type StorytellerSyncMessage } from './logic/mailboxService';
import { useMultiChannelSync } from '../../modules/sync';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot } from './types';
import { useStoryJoinLink } from './hooks/useStoryJoinLink';
import { useStorySeats } from './hooks/useStorySeats';
import { notifyAfterOwnTurn, notifyIncomingTurn } from './logic/storyTurnNotify';
import { PlayerJoinedSnackbar } from '../../modules/player-management/PlayerJoinedSnackbar';

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

  // Shared player links: import the story and take the player's seat here
  useStoryJoinLink(async (joinedGame, joinedEntries) => {
    setGame(joinedGame);
    setEntries(joinedEntries);
    await loadActiveGames();
    setActiveGameId(joinedGame.id);
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

          noteJoined(res.joined);
          // Tell the next writer if they play on this device and the app is in the background
          if (source === 'mqtt') notifyIncomingTurn(res.game, res.entries).catch(() => {});
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
  const broadcastSnapshot = useCallback(
    (newGame: StoryGameRecord, newEntries: StoryEntry[]) => {
      const snapshot: StoryGameSnapshot = { game: newGame, entries: newEntries };
      setGame(newGame);
      setEntries(newEntries);
      setActiveGameId(newGame.id);

      publish({ type: 'STORY_SYNC', snapshot }, newGame.id);
    },
    [publish],
  );

  const {
    joinedNames,
    noteJoined,
    clearJoined,
    isCurrentTurnLocal,
    claimPlayer,
    toggleCurrentTurn,
  } = useStorySeats(game, broadcastSnapshot);

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

      notifyAfterOwnTurn(snap.game, snap.entries).catch(() => {});
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <StoryHeader
        game={game}
        onExit={handleBack}
        onOpenReader={() => setReaderOpen(true)}
        onOpenEdit={() => setEditOpen(true)}
        onOpenShare={() => setShareDialogOpen(true)}
        isCurrentTurnLocal={isCurrentTurnLocal}
        canToggleLocalRemote={true}
        onToggleLocalRemote={toggleCurrentTurn}
      />

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {gameLoading && !game ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : !isCurrentTurnLocal ? (
          <WaitingForStoryTurnView
            game={game}
            onClaimPlayer={claimPlayer}
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

      <PlayerJoinedSnackbar names={joinedNames} onClose={clearJoined} />
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
        onPlayerChanged={async () => {
          const snap = await LocalStoryEngine.getGameSnapshot(game.id);
          broadcastSnapshot(snap.game, snap.entries);
        }}
      />
    </Box>
  );
};
