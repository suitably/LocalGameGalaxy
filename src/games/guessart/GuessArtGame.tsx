import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useGuessArtLobby } from './hooks/useGuessArtLobby';
import { useGuessArtGame } from './hooks/useGuessArtGame';
import { useLayout } from '../../context/LayoutContext';
import { GameSetup } from './components/GameSetup';
import { GuessArtHeader } from './components/GuessArtHeader';
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
import { gameRelayStorage } from '../../lib/push/gameRelayStorage';
import { guessArtNotificationService } from './logic/notificationService';
import { mailboxService } from './logic/mailboxService';
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
  const [completedOriginalWord, setCompletedOriginalWord] = useState<string | undefined>(undefined);
  const [completedOriginalLang, setCompletedOriginalLang] = useState<string | undefined>(undefined);
  const [completedGuessesCount, setCompletedGuessesCount] = useState<number>(0);
  const [completedRoundNumber, setCompletedRoundNumber] = useState<number>(1);
  const [completedGuesses, setCompletedGuesses] = useState<string[]>([]);
  const [completedDrawerName, setCompletedDrawerName] = useState<string | undefined>(undefined);
  const [completedGuesserName, setCompletedGuesserName] = useState<string | undefined>(undefined);

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

  const [localPlayersVersion, setLocalPlayersVersion] = useState<number>(0);
  const triggerLocalUpdate = useCallback(() => setLocalPlayersVersion((v) => v + 1), []);

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
      const relayParam = params.get('gameRelay') || params.get('relay');

      if (dataParam) {
        try {
          const jsonStr = LZString.decompressFromEncodedURIComponent(dataParam);
          if (jsonStr) {
            const snapshot = JSON.parse(jsonStr);
            if (snapshot && snapshot.game) {
              const imported = await LocalGameEngine.importSnapshot(snapshot, language);
              if (targetPlayerId) {
                playerAssignment.setLocalPlayerIds(imported.game.id, [targetPlayerId]);
                const ownRelay = storage.getPushRelayUrl();
                const prefMethod = storage.getNotificationMethod();
                const updatedPlayers = imported.game.players.map((p) =>
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
                await LocalGameEngine.updateGameDetails(imported.game.id, { players: updatedPlayers }).catch(() => {});
                // Broadcast updated player presence (including ntfyTopic & relayUrl) via MQTT mailbox
                mailboxService.publishTurn(imported.game.id, {
                  game: { ...imported.game, players: updatedPlayers },
                  round: imported.round,
                }).catch(() => {});
              }
              if (relayParam) {
                gameRelayStorage.setGameRelay(imported.game.id, relayParam);
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
        if (relayParam) {
          gameRelayStorage.setGameRelay(urlGameId, relayParam);
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
  }, [cleanUrl, language, loadActiveGames, triggerLocalUpdate]);

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

  const handleOpenShareLinks = useCallback(
    async (targetGame: GuessArtGameRecord | null, targetRound?: GuessArtRound | null) => {
      if (!targetGame) return;
      let effRound = targetRound || null;
      if (!effRound) {
        try {
          const snap = await LocalGameEngine.getGameSnapshot(targetGame.id, language);
          effRound = snap.round;
        } catch (e) {
          console.warn('[GuessArt] Failed to load round for share links:', e);
        }
      }
      setShareDialogGame(targetGame);
      setShareDialogRound(effRound);
      setShareDialogOpen(true);

      if (effRound) {
        try {
          await mailboxService.publishTurn(targetGame.id, {
            game: targetGame,
            round: effRound,
          });
        } catch (e) {
          console.warn('[GuessArt] Failed to publish snapshot on opening share dialog:', e);
        }
      }
    },
    [language],
  );

  const handleCloseInfo = () => {
    setInfoOpen(false);
    storage.set(STORAGE_KEY_SEEN_INFO, 'true');
  };

  const handleGuessSubmit = async (guess: string) => {
    const currentRoundNum = round?.roundNumber || 1;
    const currentWord = round?.word || guess;
    const originalWord =
      (round?.translations && round?.wordLanguageCode && round.translations[round.wordLanguageCode]?.canonical) ||
      round?.word;
    const originalLang = round?.wordLanguageCode;
    const currentGuessesCount = (round?.guesses.length || 0) + 1;
    const currentGuesses = round?.guesses ? [...round.guesses, guess] : [guess];
    const currentDrawerName =
      game && round ? game.players.find((p) => p.id === round.drawnById)?.name : undefined;
    const currentGuesserName =
      game && round
        ? round.guesserName ||
          game.players[(game.players.findIndex((p) => p.id === round.drawnById) + 1) % game.players.length]?.name
        : undefined;

    const result = await submitGuess(guess);
    if (result.correct) {
      setCompletedWord(currentWord);
      setCompletedOriginalWord(originalWord);
      setCompletedOriginalLang(originalLang);
      setCompletedGuessesCount(currentGuessesCount);
      setCompletedRoundNumber(currentRoundNum);
      setCompletedGuesses(currentGuesses);
      setCompletedDrawerName(currentDrawerName);
      setCompletedGuesserName(currentGuesserName);
      setSuccessModalOpen(true);
    }
    return result;
  };

  const handleNextRound = async () => {
    setSuccessModalOpen(false);
    await refresh();
  };

  const historyPlayers = game?.players || activeGames.find((g) => g.id === historyGameId)?.players || [];

  // Determine if current device draws or guesses in this round
  const drawerIdx = game && round ? game.players.findIndex((p) => p.id === round.drawnById) : -1;
  const effectiveDrawerIdx = drawerIdx >= 0 ? drawerIdx : (Math.max(1, round?.roundNumber || 1) - 1) % (game?.players.length || 1);
  const effectiveGuesserIdx = (effectiveDrawerIdx + 1) % (game?.players.length || 1);

  const activeDrawer = game ? game.players[effectiveDrawerIdx] : null;
  const activeGuesser = game ? game.players[effectiveGuesserIdx] : null;

  const hasRemotePlayers = useMemo(() => {
    return game ? game.players.some((p) => p.isRemote) : false;
  }, [game]);

  const isCurrentDrawerLocal = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    localPlayersVersion;
    if (!game || !activeDrawer) return false;
    return playerAssignment.isPlayerLocal(game.id, activeDrawer.id, !hasRemotePlayers);
  }, [game, activeDrawer, localPlayersVersion, hasRemotePlayers]);

  const isCurrentGuesserLocal = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    localPlayersVersion;
    if (!game || !activeGuesser) return false;
    return playerAssignment.isPlayerLocal(game.id, activeGuesser.id, !hasRemotePlayers);
  }, [game, activeGuesser, localPlayersVersion, hasRemotePlayers]);

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
      playerAssignment.releaseTemporaryClaims(game.id, activeTurnPlayerId);
      playerAssignment.removeLocalPlayerId(game.id, activeTurnPlayerId);
    } else {
      playerAssignment.claimTurnTemporary(game.id, activeTurnPlayerId);
    }
    triggerLocalUpdate();
    await refresh();
  }, [game, activeTurnPlayerId, isHost, isCurrentTurnLocal, triggerLocalUpdate, refresh]);

  const { setHeaderHidden } = useLayout();

  useEffect(() => {
    setHeaderHidden(Boolean(activeGameId));
    return () => setHeaderHidden(false);
  }, [activeGameId, setHeaderHidden]);

  const handleExitActiveGame = useCallback(() => {
    cleanUrl();
    setActiveGameId(null);
    loadActiveGames();
  }, [cleanUrl, loadActiveGames]);

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
      {round && (
        <GuessArtHeader
          game={game}
          round={round}
          onExit={handleExitActiveGame}
          onOpenHistory={() => handleOpenHistory(activeGameId)}
          onEditGame={() => handleOpenEdit(game)}
          onOpenShareLinks={isHost ? () => handleOpenShareLinks(game, round) : undefined}
          isCurrentTurnLocal={isCurrentTurnLocal}
          canToggleLocalRemote={isHost}
          onToggleLocalRemote={handleToggleLocalRemote}
          isTemporaryTurn={activeTurnPlayerId ? playerAssignment.isTurnClaimedTemporarily(game.id, activeTurnPlayerId) : false}
        />
      )}

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
              playerAssignment.claimTurnTemporary(game.id, playerId);
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
            isHost={isHost}
            onOpenShareLinks={isHost ? () => handleOpenShareLinks(game, round) : undefined}
            onClaimPlayer={async (playerId) => {
              playerAssignment.claimTurnTemporary(game.id, playerId);
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
        originalWord={completedOriginalWord}
        originalLanguage={completedOriginalLang}
        roundNumber={completedRoundNumber}
        guessesCount={completedGuessesCount}
        guesses={completedGuesses}
        drawerName={completedDrawerName}
        guesserName={completedGuesserName}
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
