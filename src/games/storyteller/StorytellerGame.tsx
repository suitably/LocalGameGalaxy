import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LZString from 'lz-string';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useLayout } from '../../context/LayoutContext';
import { useStorytellerLobby } from './hooks/useStorytellerLobby';
import { useStorytellerGame } from './hooks/useStorytellerGame';
import { StoryLobby } from './components/StoryLobby';
import { StoryHeader } from './components/StoryHeader';
import { StoryWriterView } from './components/StoryWriterView';
import { WaitingForStoryTurnView } from './components/WaitingForStoryTurnView';
import { StoryReaderModal } from './components/StoryReaderModal';
import { EditStoryDialog } from './components/EditStoryDialog';
import { playerAssignment } from './logic/playerAssignment';
import { LocalStoryEngine } from './logic/engine';
import type { StoryGameSnapshot } from './types';

export const StorytellerGame: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle(t('games.storyteller.title', 'Geschichtenschreiber'));

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);

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

  const {
    game,
    entries,
    loading: gameLoading,
    submitTurn,
    finishStory,
    updateGameDetails,
    refresh,
  } = useStorytellerGame(activeGameId);

  useWakeLock(Boolean(activeGameId));
  const { setHeaderHidden } = useLayout();

  useEffect(() => {
    setHeaderHidden(Boolean(activeGameId));
    return () => setHeaderHidden(false);
  }, [activeGameId, setHeaderHidden]);

  // Clean URL parameters helper
  const cleanUrl = useCallback(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    const hashWithoutQuery = window.location.hash.split('?')[0] || '#/games/storyteller';
    const cleanPath = window.location.pathname + hashWithoutQuery;
    window.history.replaceState({}, document.title, cleanPath);
  }, []);

  // Process shared turn links via URL
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

      if (dataParam) {
        try {
          const jsonStr = LZString.decompressFromEncodedURIComponent(dataParam);
          if (jsonStr) {
            const snapshot = JSON.parse(jsonStr) as StoryGameSnapshot;
            if (snapshot && snapshot.game) {
              const imported = await LocalStoryEngine.importSnapshot(snapshot);
              if (targetPlayerId) {
                playerAssignment.setLocalPlayerIds(imported.game.id, [targetPlayerId]);
              }
              setLocalVersion((v) => v + 1);
              await loadActiveGames();
              setActiveGameId(imported.game.id);
              cleanUrl();
              return;
            }
          }
        } catch (e) {
          console.warn('[Storyteller] Failed to unpack URL data payload:', e);
        }
      }

      if (urlGameId) {
        if (targetPlayerId) {
          playerAssignment.setLocalPlayerIds(urlGameId, [targetPlayerId]);
        }
        setLocalVersion((v) => v + 1);
        await loadActiveGames();
        setActiveGameId(urlGameId);
        cleanUrl();
      }
    };

    processUrlParams();
    window.addEventListener('hashchange', processUrlParams);
    return () => window.removeEventListener('hashchange', processUrlParams);
  }, [cleanUrl, loadActiveGames]);

  const handleStartGame = async (options: {
    name?: string;
    language: string;
    modifiers: typeof modifiers;
  }) => {
    const record = await createGame(options);
    setActiveGameId(record.id);
  };

  const handleShareTurn = useCallback(() => {
    if (!game) return;
    const snapshot: StoryGameSnapshot = { game, entries };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
    const activePlayer = game.players[game.currentPlayerIndex];
    const url = `${window.location.origin}${window.location.pathname}#/games/storyteller?gameId=${game.id}&player=${activePlayer?.id || ''}&data=${compressed}`;
    navigator.clipboard.writeText(url);
  }, [game, entries]);

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
    await refresh();
  }, [game, activePlayer, isCurrentTurnLocal, refresh]);

  if (!activeGameId || !game) {
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
          onResumeGame={(id) => setActiveGameId(id)}
          onDeleteGame={deleteGame}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <StoryHeader
        game={game}
        onExit={() => {
          cleanUrl();
          setActiveGameId(null);
          loadActiveGames();
        }}
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
            onClaimPlayer={async (playerId) => {
              playerAssignment.addLocalPlayerId(game.id, playerId);
              setLocalVersion((v) => v + 1);
              await refresh();
            }}
            onShareTurn={handleShareTurn}
            onOpenReader={() => setReaderOpen(true)}
          />
        ) : (
          <StoryWriterView
            game={game}
            entries={entries}
            onSubmitTurn={submitTurn}
            onFinishStory={async () => {
              await finishStory();
              setReaderOpen(true);
            }}
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
          await updateGameDetails(payload);
        }}
      />
    </Box>
  );
};
