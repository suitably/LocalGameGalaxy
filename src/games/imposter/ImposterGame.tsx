import React, { useState, useCallback, useEffect } from 'react';
import { Box, IconButton, CircularProgress } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GameSetup } from './components/GameSetup';
import { HandoverView } from './components/HandoverView';
import { GameTimer } from './components/GameTimer';
import { VotingView } from './components/VotingView';
import { GameInfoDialog } from './components/GameInfoDialog';
import { ImposterResultView } from './components/ImposterResultView';
import { useImposterGameState } from './hooks/useImposterGameState';
import { seedImposterDatabase } from './logic/dbSeeder';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useLobbyPlayers } from '../../modules/player-management';
import { storage, STORAGE_KEYS } from '../../lib/storage';

export const ImposterGame: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Set the game title in the header
  usePageTitle(t('games.imposter.title'));

  const {
    players: lobbyPlayers,
    addPlayer,
    removePlayer,
  } = useLobbyPlayers({
    storageKey: STORAGE_KEYS.IMPOSTER_SETUP_PLAYERS,
    defaultPlayers: ['Spieler 1', 'Spieler 2', 'Spieler 3'],
    minPlayers: 3,
    maxPlayers: 20,
  });

  const [isDbReady, setIsDbReady] = useState(false);

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      await seedImposterDatabase();
      setIsDbReady(true);
    };
    initDb();
  }, []);

  const [infoOpen, setInfoOpen] = useState(false);

  const handleCloseInfo = useCallback(() => {
    setInfoOpen(false);
    storage.set(STORAGE_KEYS.IMPOSTER_SEEN_INFO, 'true');
  }, []);

  const { gameState, startGame, nextHandover, goToVoting, handleKick, resetGame } =
    useImposterGameState(lobbyPlayers, i18n.language);

  useWakeLock(gameState.phase !== 'LOBBY');

  const renderPhase = () => {
    switch (gameState.phase) {
      case 'LOBBY':
        if (!isDbReady) {
          return (
            <Box display="flex" justifyContent="center" alignItems="center" py={10}>
              <CircularProgress />
            </Box>
          );
        }
        return (
          <GameSetup
            players={lobbyPlayers}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onStartGame={startGame}
          />
        );
      case 'HANDOVER': {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        return (
          <HandoverView
            key={currentPlayer.id}
            playerName={currentPlayer.name}
            isImposter={currentPlayer.isImposter}
            word={gameState.selectedWord || ''}
            hint={gameState.selectedHint || ''}
            onConfirmed={nextHandover}
          />
        );
      }
      case 'TIMER':
        return (
          <GameTimer
            timerLength={gameState.timerLength}
            onTimeUp={goToVoting}
            onEndEarly={goToVoting}
          />
        );
      case 'VOTING':
        return <VotingView players={gameState.players} onSelectPlayer={handleKick} />;
      case 'RESULT':
        return (
          <ImposterResultView
            players={gameState.players}
            winner={gameState.winner}
            onPlayAgain={resetGame}
            onBack={() => navigate('/')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto', position: 'relative' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
        }}
      >
        <IconButton color="primary" onClick={() => setInfoOpen(true)} size="large">
          <InfoOutlinedIcon fontSize="inherit" />
        </IconButton>
      </Box>
      <Box sx={{ py: 2, mt: 4 }}>{renderPhase()}</Box>
      <GameInfoDialog open={infoOpen} onClose={handleCloseInfo} />
    </Box>
  );
};
