import React, { useState } from 'react';
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
import { RoundSuccessModal } from './components/RoundSuccessModal';
import { GameInfoDialog } from './components/GameInfoDialog';
import { RoundHistoryDialog } from './components/RoundHistoryDialog';
import { EditGameDialog } from './components/EditGameDialog';
import { CatalogueEditorDialog } from './components/catalogue/CatalogueEditorDialog';
import { storage } from '../../lib/storage';
import type { GuessArtGameRecord } from './logic/types';

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
  const [infoOpen, setInfoOpen] = useState<boolean>(
    () => storage.get(STORAGE_KEY_SEEN_INFO) !== 'true',
  );
  const [successModalOpen, setSuccessModalOpen] = useState<boolean>(false);
  const [completedWord, setCompletedWord] = useState<string>('');
  const [completedGuessesCount, setCompletedGuessesCount] = useState<number>(0);

  const language = i18n.language.startsWith('de') ? 'de' : 'en';

  const {
    lobbyPlayers,
    addPlayer,
    removePlayer,
    activeGames,
    createGame,
    updateGameDetails: updateGameDetailsLobby,
    deleteGame,
  } = useGuessArtLobby();

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

  const handleCloseInfo = () => {
    setInfoOpen(false);
    storage.set(STORAGE_KEY_SEEN_INFO, 'true');
  };

  const handleOpenHistory = (gameId?: string | null) => {
    setHistoryGameId(gameId || activeGameId);
    setHistoryOpen(true);
  };

  const handleOpenEdit = (gameRecord?: GuessArtGameRecord | null) => {
    const target = gameRecord || game;
    if (target) {
      setEditGameRecord(target);
      setEditDialogOpen(true);
    }
  };

  const handleSaveGameDetails = async (payload: {
    name: string;
    players: { id: string; name: string }[];
  }) => {
    if (!editGameRecord) return;
    await updateGameDetailsLobby(editGameRecord.id, payload, language);
    if (activeGameId === editGameRecord.id) {
      await updateGameDetailsActive(payload);
    }
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

  // Lobby Setup View
  if (!activeGameId || !game) {
    return (
      <Box sx={{ width: '100%', height: '100%', overflowY: 'auto' }}>
        <GameSetup
          players={lobbyPlayers}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          onStartGame={handleStartGame}
          activeGames={activeGames}
          onResumeGame={(id) => setActiveGameId(id)}
          onDeleteGame={deleteGame}
          onOpenHistory={handleOpenHistory}
          onEditGame={handleOpenEdit}
          onOpenCatalogue={() => setCatalogueEditorOpen(true)}
          onOpenInfo={() => setInfoOpen(true)}
        />
        <GameInfoDialog open={infoOpen} onClose={handleCloseInfo} />
        <RoundHistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          gameId={historyGameId}
          players={historyPlayers}
        />
        <EditGameDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          game={editGameRecord}
          onSave={handleSaveGameDetails}
        />
        <CatalogueEditorDialog
          open={catalogueEditorOpen}
          onClose={() => setCatalogueEditorOpen(false)}
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
        onExit={() => setActiveGameId(null)}
        onOpenHistory={() => handleOpenHistory(activeGameId)}
        onEditGame={() => handleOpenEdit(game)}
      />

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
        {gameLoading && !round ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
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
        game={editGameRecord}
        onSave={handleSaveGameDetails}
      />
      <CatalogueEditorDialog
        open={catalogueEditorOpen}
        onClose={() => setCatalogueEditorOpen(false)}
      />
    </Box>
  );
};
