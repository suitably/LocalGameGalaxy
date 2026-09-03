import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
import { playerAssignment } from './logic/playerAssignment';
import { LocalStoryEngine } from './logic/engine';
import { mailboxService } from '../guessart/logic/mailboxService';
import { universalPartyManager } from '../../features/party/logic/universalPartyManager';
import { storage } from '../../lib/storage';
import type { GameSnapshot } from '../guessart/logic/types';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot, StoryPlayer } from './types';

const STORAGE_PLAYER_NAME = 'guessart_player_name';

interface StorytellerGameProps {
  onBackToMenu?: () => void;
  initialRoomId?: string;
}

export const StorytellerGame: React.FC<StorytellerGameProps> = ({
  onBackToMenu,
  initialRoomId,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle(t('games.storyteller.title', 'Geschichtenschreiber'));

  const parsedUrl = useMemo(() => {
    const hash = window.location.hash;
    const queryString = window.location.search || (hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
    const params = new URLSearchParams(queryString);
    const room = params.get('room') || params.get('roomId') || initialRoomId || null;
    const gameId = params.get('gameId') || params.get('game') || null;
    return {
      room: room ? room.toUpperCase().trim() : null,
      gameId,
    };
  }, [initialRoomId]);

  const partyState = universalPartyManager.getRoomState();
  const effectiveRoomId = parsedUrl.room || partyState?.roomId || null;

  const [myPlayerId] = useState<string>(() => universalPartyManager.getMyPlayerId());
  const [myPlayerName] = useState<string>(() => storage.get(STORAGE_PLAYER_NAME, 'Spieler'));

  const [activeGameId, setActiveGameId] = useState<string | null>(parsedUrl.gameId || null);
  const [game, setGame] = useState<StoryGameRecord | null>(null);
  const [entries, setEntries] = useState<StoryEntry[]>([]);
  const [gameLoading, setGameLoading] = useState<boolean>(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);

  const isHost = Boolean(
    !effectiveRoomId ||
    universalPartyManager.isHost(effectiveRoomId) ||
    game?.players[0]?.id === myPlayerId,
  );

  const {
    lobbyPlayers,
    modifiers,
    activeGames,
    addPlayer,
    removePlayer,
    togglePlayerRemote,
    updateModifier,
    createGame,
    deleteGame,
    loadActiveGames,
  } = useStorytellerLobby();

  useWakeLock(Boolean(activeGameId || game));
  const { setHeaderHidden } = useLayout();

  useEffect(() => {
    setHeaderHidden(Boolean(activeGameId || game));
    return () => setHeaderHidden(false);
  }, [activeGameId, game, setHeaderHidden]);

  const handleBack = useCallback(() => {
    if (effectiveRoomId) {
      sessionStorage.removeItem(`galaxy_story_state_${effectiveRoomId}`);
    }
    if (onBackToMenu) {
      onBackToMenu();
    } else {
      setActiveGameId(null);
      setGame(null);
      setEntries([]);
      loadActiveGames();
      navigate('/games/storyteller');
    }
  }, [effectiveRoomId, onBackToMenu, loadActiveGames, navigate]);

  // Broadcast state & events over BroadcastChannel & MQTT Mailbox
  const broadcastSnapshot = useCallback((newGame: StoryGameRecord, newEntries: StoryEntry[]) => {
    const snapshot: StoryGameSnapshot = { game: newGame, entries: newEntries };
    setGame(newGame);
    setEntries(newEntries);
    setActiveGameId(newGame.id);

    const roomId = effectiveRoomId || newGame.id;
    sessionStorage.setItem(`galaxy_story_state_${roomId}`, JSON.stringify(snapshot));

    try {
      const channel = new BroadcastChannel(`storyteller_channel_${roomId}`);
      channel.postMessage({ type: 'STORY_SYNC', snapshot, roomId });
      channel.close();
    } catch {
      // ignore
    }

    try {
      const topic = `storyteller_room_${roomId}`;
      mailboxService.publishTurn(topic, { type: 'STORY_SYNC', snapshot, roomId } as unknown as GameSnapshot);
    } catch {
      // ignore
    }
  }, [effectiveRoomId]);

  // Handle party mode auto-start
  useEffect(() => {
    if (partyState?.status === 'in_game' && partyState.activeGame === 'storyteller' && !game && isHost) {
      const partyPlayers: StoryPlayer[] = partyState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isRemote: p.id !== myPlayerId,
      }));

      LocalStoryEngine.createGame({
        name: `${t('games.storyteller.title', 'Geschichtenschreiber')} (${partyState.roomId})`,
        players: partyPlayers,
        language: 'de',
        modifiers,
      }).then((rec) => {
        broadcastSnapshot(rec, []);
      });
    }
  }, [partyState, game, isHost, myPlayerId, modifiers, broadcastSnapshot, t]);

  // MQTT Mailbox & BroadcastChannel synchronization effect
  useEffect(() => {
    const roomId = effectiveRoomId || activeGameId;
    if (!roomId) return;

    const topic = `storyteller_room_${roomId}`;
    const channel = new BroadcastChannel(`storyteller_channel_${roomId}`);

    channel.onmessage = (event) => {
      if (event.data?.type === 'STORY_SYNC' && event.data.snapshot) {
        setGame(event.data.snapshot.game);
        setEntries(event.data.snapshot.entries);
        setActiveGameId(event.data.snapshot.game.id);
        LocalStoryEngine.importSnapshot(event.data.snapshot);
      } else if (event.data?.type === 'STORY_FORCE_END') {
        handleBack();
      } else if (event.data?.type === 'STORY_FINISH') {
        if (event.data.snapshot) {
          setGame(event.data.snapshot.game);
          setEntries(event.data.snapshot.entries);
        }
        setReaderOpen(true);
      }
    };

    mailboxService.subscribeToGame(topic, async (incoming: unknown) => {
      if (!incoming || typeof incoming !== 'object' || !('type' in incoming)) return;
      const msg = incoming as {
        type: string;
        snapshot?: StoryGameSnapshot;
        player?: StoryPlayer;
      };

      if (msg.type === 'STORY_FORCE_END') {
        handleBack();
      } else if (msg.type === 'STORY_FINISH') {
        if (msg.snapshot) {
          setGame(msg.snapshot.game);
          setEntries(msg.snapshot.entries);
          LocalStoryEngine.importSnapshot(msg.snapshot);
        }
        setReaderOpen(true);
      } else if (msg.type === 'STORY_SYNC' && msg.snapshot) {
        setGame(msg.snapshot.game);
        setEntries(msg.snapshot.entries);
        setActiveGameId(msg.snapshot.game.id);
        LocalStoryEngine.importSnapshot(msg.snapshot);
      } else if (msg.type === 'STORY_REQUEST_SYNC') {
        if (isHost && game) {
          broadcastSnapshot(game, entries);
        }
      } else if (msg.type === 'STORY_JOIN' && msg.player) {
        const newPlayer = msg.player;
        if (isHost && game && !game.players.some((p) => p.id === newPlayer.id)) {
          const updated = await LocalStoryEngine.updateGameDetails(game.id, {
            players: [...game.players, newPlayer],
          });
          broadcastSnapshot(updated.game, updated.entries);
        }
      }
    });

    // Send join announcement
    try {
      mailboxService.publishTurn(topic, {
        type: 'STORY_JOIN',
        player: { id: myPlayerId, name: myPlayerName, isRemote: !isHost },
      } as unknown as GameSnapshot);
    } catch {
      // ignore
    }

    if (isHost && game) {
      broadcastSnapshot(game, entries);
    } else if (!game) {
      try {
        mailboxService.publishTurn(topic, {
          type: 'STORY_REQUEST_SYNC',
          playerId: myPlayerId,
        } as unknown as GameSnapshot);
      } catch {
        // ignore
      }
    }

    return () => {
      channel.close();
      mailboxService.unsubscribe();
    };
  }, [effectiveRoomId, activeGameId, isHost, game, entries, myPlayerId, myPlayerName, broadcastSnapshot, handleBack]);

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

      const roomId = effectiveRoomId || game.id;
      try {
        const channel = new BroadcastChannel(`storyteller_channel_${roomId}`);
        channel.postMessage({ type: 'STORY_FINISH', snapshot: snap });
        channel.close();
      } catch {
        // ignore
      }
      try {
        const topic = `storyteller_room_${roomId}`;
        mailboxService.publishTurn(topic, { type: 'STORY_FINISH', snapshot: snap } as unknown as GameSnapshot);
      } catch {
        // ignore
      }

      setReaderOpen(true);
    } finally {
      setGameLoading(false);
    }
  };

  const handleShareTurn = useCallback(() => {
    const shareRoom = effectiveRoomId || game?.id;
    const url = `${window.location.origin}${window.location.pathname}#/games/storyteller?room=${shareRoom || ''}`;
    navigator.clipboard.writeText(url);
  }, [effectiveRoomId, game?.id]);

  const activePlayer = game?.players[game.currentPlayerIndex];
  const myPlayer = game?.players.find((p) => p.id === myPlayerId)
    || game?.players.find((p) => p.name.toLowerCase() === myPlayerName.toLowerCase());

  const isCurrentTurnLocal = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    localVersion;
    if (!game || !activePlayer) return true;
    if (myPlayer) {
      return myPlayer.id === activePlayer.id;
    }
    return playerAssignment.isPlayerLocal(game.id, activePlayer.id, true);
  }, [game, activePlayer, myPlayer, localVersion]);

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
          onToggleRemote={togglePlayerRemote}
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
        roomId={effectiveRoomId || undefined}
        onExit={handleBack}
        onOpenReader={() => setReaderOpen(true)}
        onOpenEdit={() => setEditOpen(true)}
        onShareTurn={handleShareTurn}
        isCurrentTurnLocal={isCurrentTurnLocal}
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
            roomId={effectiveRoomId || undefined}
            onClaimPlayer={(playerId) => {
              playerAssignment.addLocalPlayerId(game.id, playerId);
              setLocalVersion((v) => v + 1);
            }}
            onShareTurn={handleShareTurn}
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
    </Box>
  );
};
