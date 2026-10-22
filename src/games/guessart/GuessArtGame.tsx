import { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useGuessArtLobby } from './hooks/useGuessArtLobby';
import { useGuessArtUrlParam } from './hooks/useGuessArtUrlParam';
import { useGuessArtGame } from './hooks/useGuessArtGame';
import { useGuessArtJoinLink } from './hooks/useGuessArtJoinLink';
import { useGuessArtTurnSeat } from './hooks/useGuessArtTurnSeat';
import { useHeaderLayout } from '../../context/HeaderLayoutContext';
import { GameSetup } from './components/GameSetup';
import { GuessArtHeader } from './components/GuessArtHeader';
import { WordSelector } from './components/WordSelector';
import { DrawingCanvas } from '../../modules/drawing';
import { GuessPanel } from './components/GuessPanel';
import { WaitingForDrawerView } from './components/WaitingForDrawerView';
import { WaitingForGuesserView } from './components/WaitingForGuesserView';
import { SharePlayerLinksDialog } from './components/SharePlayerLinksDialog';
import { RoundSuccessModal } from './components/RoundSuccessModal';
import { GameInfoDialog } from './components/GameInfoDialog';
import { RoundHistoryDialog } from './components/RoundHistoryDialog';
import { EditGameDialog } from './components/EditGameDialog';
import { CatalogueEditorDialog } from './components/catalogue/CatalogueEditorDialog';
import { cleanWindowUrlQuery } from '../../modules/sharing';
import { PlayerJoinedSnackbar } from '../../modules/player-management/PlayerJoinedSnackbar';
import { storage } from '../../lib/storage';
import { playerAssignment } from './logic/playerAssignment';
import { guessArtNotificationService } from './logic/notificationService';
import { guessArtMailbox } from './logic/guessArtMailbox';
import { LocalGameEngine } from './logic/engine';
import type { GuessArtGameRecord, GuessArtRound } from './logic/types';

const STORAGE_KEY_SEEN_INFO = 'guessart_seen_info';
export const GuessArtGame: React.FC = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t('games.guessart.title', 'GuessArt'));

  const { activeGameId, setActiveGameId } = useGuessArtUrlParam();
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
    joinedNames,
    clearJoined,
  } = useGuessArtGame(activeGameId, language);
  const {
    isCurrentTurnLocal,
    isCurrentDrawerLocal,
    isCurrentGuesserLocal,
    isHost,
    isTemporaryTurn,
    localPlayerIds,
    triggerLocalUpdate,
    handleToggleLocalRemote,
  } = useGuessArtTurnSeat(game, round, refresh);

  // After a share or "play here": reload, so the share dialog never works on a stale player list.
  const handlePlayersChanged = useCallback(async () => {
    triggerLocalUpdate();
    if (shareDialogGame) {
      const snap = await LocalGameEngine.getGameSnapshot(shareDialogGame.id, language).catch(
        () => null,
      );
      if (snap) setShareDialogGame(snap.game);
    }
    await (activeGameId ? refresh() : loadActiveGames());
  }, [triggerLocalUpdate, shareDialogGame, language, activeGameId, refresh, loadActiveGames]);

  useGuessArtJoinLink(language, async (gameId) => {
    triggerLocalUpdate();
    await loadActiveGames();
    setActiveGameId(gameId);
  });

  useWakeLock(Boolean(activeGameId));

  const handleStartGame = async (options: {
    name?: string;
    language: string;
    manualWordMode: boolean;
  }) => {
    const record = await createGame(options);
    setActiveGameId(record.id);
  };

  const handleSaveGameDetails = async (payload: {
    name?: string;
    players?: { id: string; name: string }[];
  }) => {
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
          await guessArtMailbox.publish(targetGame.id, {
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
      (round?.translations &&
        round?.wordLanguageCode &&
        round.translations[round.wordLanguageCode]?.canonical) ||
      round?.word;
    const originalLang = round?.wordLanguageCode;
    const currentGuessesCount = (round?.guesses.length || 0) + 1;
    const currentGuesses = round?.guesses ? [...round.guesses, guess] : [guess];
    const currentDrawerName =
      game && round ? game.players.find((p) => p.id === round.drawnById)?.name : undefined;
    const currentGuesserName =
      game && round
        ? round.guesserName ||
          game.players[
            (game.players.findIndex((p) => p.id === round.drawnById) + 1) % game.players.length
          ]?.name
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

  const historyPlayers =
    game?.players || activeGames.find((g) => g.id === historyGameId)?.players || [];

  const { setHeaderHidden } = useHeaderLayout();

  useEffect(() => {
    setHeaderHidden(Boolean(activeGameId));
    return () => setHeaderHidden(false);
  }, [activeGameId, setHeaderHidden]);

  const handleExitActiveGame = useCallback(() => {
    cleanWindowUrlQuery('#/guessart');
    setActiveGameId(null);
    loadActiveGames();
  }, [loadActiveGames]);

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
            editGameRecord?.players[0]
              ? playerAssignment.isLocal(editGameRecord, editGameRecord.players[0].id)
              : true
          }
          localPlayerIds={editGameRecord ? playerAssignment.localPlayerIds(editGameRecord) : []}
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
          onPlayerChanged={handlePlayersChanged}
          game={shareDialogGame}
          round={shareDialogRound}
        />
      </Box>
    );
  }

  // Active Game Session View
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
          isTemporaryTurn={isTemporaryTurn}
        />
      )}

      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 0.5, sm: 1.5 },
        }}
      >
        {gameLoading && !round ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (round?.status === 'selecting' || round?.status === 'drawing') &&
          !isCurrentDrawerLocal ? (
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
            initialCanvasData={round?.canvasData}
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

      <PlayerJoinedSnackbar names={joinedNames} onClose={clearJoined} />
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
        localPlayerIds={localPlayerIds}
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
        onPlayerChanged={handlePlayersChanged}
        game={shareDialogGame}
        round={shareDialogRound}
      />
    </Box>
  );
};
