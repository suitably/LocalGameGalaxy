import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useGuessArtLobby } from './hooks/useGuessArtLobby';
import { useGuessArtGame } from './hooks/useGuessArtGame';
import { GameSetup } from './components/GameSetup';
import { GameHeader } from './components/GameHeader';
import { WordSelector } from './components/WordSelector';
import { DrawingCanvas } from './components/DrawingCanvas';
import { GuessPanel } from './components/GuessPanel';
import { WaitingForDrawerView } from './components/WaitingForDrawerView';
import { WaitingForGuesserView } from './components/WaitingForGuesserView';
import { SharePlayerLinksDialog } from './components/SharePlayerLinksDialog';
import { RoundSuccessModal } from './components/RoundSuccessModal';
import { GameInfoDialog } from './components/GameInfoDialog';
import { RoundHistoryDialog } from './components/RoundHistoryDialog';
import { EditGameDialog } from './components/EditGameDialog';
import { CatalogueEditorDialog } from './components/catalogue/CatalogueEditorDialog';
import { storage } from '../../lib/storage';
import { playerAssignment } from './logic/playerAssignment';
import { guessArtNotificationService } from './logic/notificationService';
import LZString from 'lz-string';
import { LocalGameEngine } from './logic/engine';
import type { GuessArtGameRecord, GuessArtRound } from './logic/types';

const STORAGE_KEY_SEEN_INFO = 'guessart_seen_info';

export const GuessArtGame: React.FC = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t('games.guessart.title', 'GuessArt'));

  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [historyGameId, setHistoryGameId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [catalogueEditorOpen, setCatalogueEditorOpen] = useState<boolean>(false);
  const [editGameRecord, setEditGameRecord] = useState<GuessArtGameRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);
  const [successModalOpen, setSuccessModalOpen] = useState<boolean>(false);
  const [completedWord, setCompletedWord] = useState<string>('');
  const [completedGuessesCount, setCompletedGuessesCount] = useState<number>(0);

  // Share Player Links Modal state
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [shareDialogGame, setShareDialogGame] = useState<GuessArtGameRecord | null>(null);
  const [shareDialogRound, setShareDialogRound] = useState<GuessArtRound | null>(null);

  const language = i18n.language.startsWith('de') ? 'de' : 'en';

  const {
    lobbyPlayers,
    addPlayer,
    togglePlayerRemote,
    removePlayer,
    activeGames,
    createGame,
    updateGameDetails: updateGameDetailsLobby,
    deleteGame,
    loadActiveGames,
  } = useGuessArtLobby();

  const cleanUrl = useCallback(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    const hashWithoutQuery = window.location.hash.split('?')[0] || '#/games/guessart';
    const cleanPath = window.location.pathname + hashWithoutQuery;
    window.history.replaceState({}, document.title, cleanPath);
  }, []);

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
            const snapshot = JSON.parse(jsonStr);
            if (snapshot && snapshot.game) {
              const imported = await LocalGameEngine.importSnapshot(snapshot, language);
              if (targetPlayerId) {
                playerAssignment.setLocalPlayerIds(imported.game.id, [targetPlayerId]);
              }
              triggerLocalUpdate();
              await loadActiveGames();
              setActiveGameId(imported.game.id);
              cleanUrl();
              return;
            }
          }
        } catch (e) {
          console.warn('[GuessArt] Failed to unpack URL data payload:', e);
        }
      }

      if (urlGameId) {
        if (targetPlayerId) {
          playerAssignment.setLocalPlayerIds(urlGameId, [targetPlayerId]);
        }
        triggerLocalUpdate();
        await loadActiveGames();
        setActiveGameId(urlGameId);
        cleanUrl();
      }
    };

    processUrlParams();
    window.addEventListener('hashchange', processUrlParams);
    return () => {
      window.removeEventListener('hashchange', processUrlParams);
    };
  }, [cleanUrl, language, loadActiveGames]);

  // Request browser notifications for async turn handoffs
  useEffect(() => {
    guessArtNotificationService.requestPermission().catch(() => {});
  }, []);

  const {
    game,
    round,
    loading: gameLoading,
    selectWord,
    submitDrawing,
    submitGuess,
    requestHint,
    updateGameDetails: updateGameDetailsActive,
    refresh,
  } = useGuessArtGame(activeGameId, language);

  useWakeLock(Boolean(activeGameId));

  const handleStartGame = async (options: { name?: string; language: string; manualWordMode: boolean }) => {
    const record = await createGame(options);
    setActiveGameId(record.id);
  };

  const handleSaveGameDetails = async (payload: { name?: string; players?: { id: string; name: string }[] }) => {
    if (activeGameId) {
      await updateGameDetailsActive(payload);
    } else if (editGameRecord) {
      await updateGameDetailsLobby(editGameRecord.id, payload, language);
    }
    setEditDialogOpen(false);
  };

  const handleOpenHistory = (gameId: string | null) => {
    setHistoryGameId(gameId);
    setHistoryOpen(true);
  };

  const handleOpenEdit = (targetGame: GuessArtGameRecord | null) => {
    setEditGameRecord(targetGame);
    setEditDialogOpen(true);
  };

  const handleOpenShareLinks = (targetGame: GuessArtGameRecord | null, targetRound?: GuessArtRound | null) => {
    setShareDialogGame(targetGame);
    setShareDialogRound(targetRound || null);
    setShareDialogOpen(true);
  };

  const handleCloseInfo = () => {
    setInfoOpen(false);
    storage.set(STORAGE_KEY_SEEN_INFO, 'true');
  };

  const handleGuessSubmit = async (guess: string) => {
    const result = await submitGuess(guess);
    if (result.correct) {
      setCompletedWord(round?.word || guess);
      setCompletedGuessesCount((round?.guesses.length || 0) + 1);
      setSuccessModalOpen(true);
    }
    return result;
  };

  const handleNextRound = async () => {
    setSuccessModalOpen(false);
    await refresh();
  };

  const historyPlayers = game?.players || activeGames.find((g) => g.id === historyGameId)?.players || [];

  const [localPlayersVersion, setLocalPlayersVersion] = useState<number>(0);
  const triggerLocalUpdate = useCallback(() => setLocalPlayersVersion((v) => v + 1), []);

  // Determine if current device draws or guesses in this round
  const drawerIdx = game && round ? game.players.findIndex((p) => p.id === round.drawnById) : -1;
  const effectiveDrawerIdx = drawerIdx >= 0 ? drawerIdx : (Math.max(1, round?.roundNumber || 1) - 1) % (game?.players.length || 1);
  const effectiveGuesserIdx = (effectiveDrawerIdx + 1) % (game?.players.length || 1);

  const activeDrawer = game ? game.players[effectiveDrawerIdx] : null;
  const activeGuesser = game ? game.players[effectiveGuesserIdx] : null;

  const isCurrentDrawerLocal = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    localPlayersVersion;
    return game && activeDrawer ? playerAssignment.isPlayerLocal(game.id, activeDrawer.id, true) : true;
  }, [game, activeDrawer, localPlayersVersion]);

  const isCurrentGuesserLocal = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    localPlayersVersion;
    return game && activeGuesser ? playerAssignment.isPlayerLocal(game.id, activeGuesser.id, true) : true;
  }, [game, activeGuesser, localPlayersVersion]);

  const isDrawing = round?.status === 'selecting' || round?.status === 'drawing';
  const isCurrentTurnLocal = isDrawing ? isCurrentDrawerLocal : isCurrentGuesserLocal;
  const activeTurnPlayerId = isDrawing
    ? (round?.drawnById || (game && activeDrawer ? activeDrawer.id : null))
    : (game && activeGuesser ? activeGuesser.id : null);

  const isHost = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    localPlayersVersion;
    if (!game || !game.players[0]) return true;
    return playerAssignment.isPlayerLocal(game.id, game.players[0].id, false);
  }, [game, localPlayersVersion]);

  const handleToggleLocalRemote = useCallback(async () => {
    if (!game || !activeTurnPlayerId || !isHost) return;
    if (isCurrentTurnLocal) {
      playerAssignment.removeLocalPlayerId(game.id, activeTurnPlayerId);
    } else {
      playerAssignment.addLocalPlayerId(game.id, activeTurnPlayerId);
    }
    triggerLocalUpdate();
    await refresh();
  }, [game, activeTurnPlayerId, isHost, isCurrentTurnLocal, triggerLocalUpdate, refresh]);

  // Lobby Setup View
  if (!activeGameId || !game) {
    return (
      <Box sx={{ width: '100%', height: '100%', overflowY: 'auto' }}>
        <GameSetup
          players={lobbyPlayers}
          onAddPlayer={addPlayer}
          onToggleRemote={togglePlayerRemote}
          onRemovePlayer={removePlayer}
          onStartGame={handleStartGame}
          activeGames={activeGames}
          onResumeGame={(id) => setActiveGameId(id)}
          onDeleteGame={deleteGame}
          onOpenHistory={handleOpenHistory}
          onEditGame={handleOpenEdit}
          onOpenShareLinks={(g) => handleOpenShareLinks(g, null)}
          onOpenCatalogue={() => setCatalogueEditorOpen(true)}
          onOpenInfo={() => setInfoOpen(true)}
        />
        <GameInfoDialog open={infoOpen} onClose={handleCloseInfo} />
        <CatalogueEditorDialog
          open={catalogueEditorOpen}
          onClose={() => setCatalogueEditorOpen(false)}
        />
        <EditGameDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          game={editGameRecord}
          isHost={
            editGameRecord && editGameRecord.players[0]
              ? playerAssignment.isPlayerLocal(editGameRecord.id, editGameRecord.players[0].id, false)
              : true
          }
          localPlayerIds={editGameRecord ? playerAssignment.getLocalPlayerIds(editGameRecord.id) : []}
          onSave={handleSaveGameDetails}
        />
        <RoundHistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          gameId={historyGameId}
          players={historyPlayers}
        />
        <SharePlayerLinksDialog
          open={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            triggerLocalUpdate();
          }}
          onPlayerChanged={triggerLocalUpdate}
          game={shareDialogGame}
          round={shareDialogRound}
        />
      </Box>
    );
  }

  // Active Game Session View
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <GameHeader
        game={game}
        round={round}
        onExit={() => {
          cleanUrl();
          setActiveGameId(null);
          loadActiveGames();
        }}
        onOpenHistory={() => handleOpenHistory(activeGameId)}
        onEditGame={() => handleOpenEdit(game)}
        onOpenShareLinks={isHost ? () => handleOpenShareLinks(game, round) : undefined}
        isCurrentTurnLocal={isCurrentTurnLocal}
        canToggleLocalRemote={isHost}
        onToggleLocalRemote={handleToggleLocalRemote}
      />

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: { xs: 0.5, sm: 1.5 } }}>
        {gameLoading && !round ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (round?.status === 'selecting' || round?.status === 'drawing') && !isCurrentDrawerLocal ? (
          <WaitingForDrawerView
            game={game}
            round={round}
            isHost={isHost}
            onOpenShareLinks={isHost ? () => handleOpenShareLinks(game, round) : undefined}
            onClaimPlayer={async (playerId) => {
              playerAssignment.addLocalPlayerId(game.id, playerId);
              triggerLocalUpdate();
              await refresh();
            }}
          />
        ) : round?.status === 'selecting' ? (
          <WordSelector
            currentRound={round}
            onSelectWord={selectWord}
            onOpenCatalogue={() => setCatalogueEditorOpen(true)}
            manualModeDefault={Boolean(game.options.manualWordMode)}
          />
        ) : round?.status === 'drawing' ? (
          <DrawingCanvas
            currentRound={round}
            onSubmit={submitDrawing}
            loading={gameLoading}
          />
        ) : round?.status === 'guessing' && !isCurrentGuesserLocal ? (
          <WaitingForGuesserView
            game={game}
            round={round}
            onOpenShareLinks={() => handleOpenShareLinks(game, round)}
            onClaimPlayer={async (playerId) => {
              playerAssignment.addLocalPlayerId(game.id, playerId);
              triggerLocalUpdate();
              await refresh();
            }}
          />
        ) : round?.status === 'guessing' ? (
          <GuessPanel
            currentRound={round}
            onSubmitGuess={handleGuessSubmit}
            onRequestHint={requestHint}
          />
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        )}
      </Box>

      <RoundSuccessModal
        open={successModalOpen}
        word={completedWord}
        roundNumber={round?.roundNumber || 1}
        guessesCount={completedGuessesCount}
        guesses={round?.guesses || []}
        drawerName={game && round ? game.players.find((p) => p.id === round.drawnById)?.name : undefined}
        guesserName={game && round ? (round.guesserName || game.players[(game.players.findIndex((p) => p.id === round.drawnById) + 1) % game.players.length]?.name) : undefined}
        language={language}
        onNextRound={handleNextRound}
      />

      <GameInfoDialog open={infoOpen} onClose={handleCloseInfo} />
      <RoundHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        gameId={historyGameId || activeGameId}
        players={historyPlayers}
      />
      <EditGameDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        game={editGameRecord || game}
        isHost={isHost}
        localPlayerIds={playerAssignment.getLocalPlayerIds(game?.id || activeGameId || '')}
        onSave={handleSaveGameDetails}
      />
      <CatalogueEditorDialog
        open={catalogueEditorOpen}
        onClose={() => setCatalogueEditorOpen(false)}
      />
      <SharePlayerLinksDialog
        open={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
          triggerLocalUpdate();
        }}
        onPlayerChanged={triggerLocalUpdate}
        game={shareDialogGame}
        round={shareDialogRound}
      />
    </Box>
  );
};
