import { useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
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
import { GuessArtSessionView } from './components/GuessArtSessionView';
import { GuessArtDialogs } from './components/GuessArtDialogs';
import { useGuessArtDialogState } from './hooks/useGuessArtDialogState';
import { useCompletedRound } from './hooks/useCompletedRound';
import { useGuessArtShareDialog } from './hooks/useGuessArtShareDialog';
import { cleanWindowUrlQuery } from '../../modules/sharing';
import { playerAssignment } from './logic/playerAssignment';
import { guessArtNotificationService } from './logic/notificationService';

export const GuessArtGame: React.FC = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t('games.guessart.title', 'GuessArt'));

  const { activeGameId, setActiveGameId } = useGuessArtUrlParam();
  const {
    historyGameId,
    historyOpen,
    setHistoryOpen,
    catalogueEditorOpen,
    setCatalogueEditorOpen,
    editGameRecord,
    editDialogOpen,
    setEditDialogOpen,
    infoOpen,
    setInfoOpen,
    handleOpenHistory,
    handleOpenEdit,
    handleCloseInfo,
  } = useGuessArtDialogState();
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
  const seat = useGuessArtTurnSeat(game, round, refresh);
  const { triggerLocalUpdate } = seat;

  const reloadAfterPlayersChanged = useCallback(
    () => (activeGameId ? refresh() : loadActiveGames()),
    [activeGameId, refresh, loadActiveGames],
  );
  const {
    shareDialogOpen,
    shareDialogGame,
    shareDialogRound,
    handlePlayersChanged,
    handleOpenShareLinks,
    handleCloseShare,
  } = useGuessArtShareDialog(language, triggerLocalUpdate, reloadAfterPlayersChanged);

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

  const completedRound = useCompletedRound(game, round, submitGuess, refresh);

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

  const dialogProps = {
    infoOpen,
    onCloseInfo: handleCloseInfo,
    catalogueEditorOpen,
    onCloseCatalogue: () => setCatalogueEditorOpen(false),
    historyOpen,
    onCloseHistory: () => setHistoryOpen(false),
    historyPlayers,
    editDialogOpen,
    onCloseEdit: () => setEditDialogOpen(false),
    onSaveEdit: handleSaveGameDetails,
    shareDialogOpen,
    onCloseShare: handleCloseShare,
    onPlayerChanged: handlePlayersChanged,
    shareGame: shareDialogGame,
    shareRound: shareDialogRound,
  };

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
        <GuessArtDialogs
          {...dialogProps}
          editGame={editGameRecord}
          isHost={
            editGameRecord?.players[0]
              ? playerAssignment.isLocal(editGameRecord, editGameRecord.players[0].id)
              : true
          }
          localPlayerIds={editGameRecord ? playerAssignment.localPlayerIds(editGameRecord) : []}
          historyGameId={historyGameId}
        />
      </Box>
    );
  }

  // Active Game Session View
  return (
    <GuessArtSessionView
      game={game}
      round={round}
      gameLoading={gameLoading}
      language={language}
      seat={seat}
      completedRound={completedRound}
      actions={{ selectWord, submitDrawing, requestHint, refresh }}
      joinedNames={joinedNames}
      onClearJoined={clearJoined}
      onExit={handleExitActiveGame}
      onOpenHistory={() => handleOpenHistory(activeGameId)}
      onEditGame={() => handleOpenEdit(game)}
      onOpenCatalogue={() => setCatalogueEditorOpen(true)}
      onOpenShareLinks={() => handleOpenShareLinks(game, round)}
    >
      <GuessArtDialogs
        {...dialogProps}
        editGame={editGameRecord || game}
        isHost={seat.isHost}
        localPlayerIds={seat.localPlayerIds}
        historyGameId={historyGameId || activeGameId}
      />
    </GuessArtSessionView>
  );
};
