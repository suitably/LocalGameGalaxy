import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GarticPromptStep } from './components/GarticPromptStep';
import { GarticDrawingStep } from './components/GarticDrawingStep';
import { GarticGuessingStep } from './components/GarticGuessingStep';
import { GarticAlbumReveal } from './components/GarticAlbumReveal';
import { GarticWaitingStatus } from './components/GarticWaitingStatus';
import { GarticHeader } from './components/GarticHeader';
import { useGarticGameState } from './hooks/useGarticGameState';

interface GarticPhoneGameProps {
  onBackToMenu?: () => void;
  initialRoomId?: string;
}

export const GarticPhoneGame: React.FC<GarticPhoneGameProps> = ({
  onBackToMenu,
  initialRoomId,
}) => {
  const navigate = useNavigate();
  const handleBack = onBackToMenu || (() => navigate('/party'));

  const {
    gameState,
    roomId,
    myPlayerId,
    myPlayerName,
    myPlayer,
    isHost,
    taskType,
    previousStep,
    hasSubmitted,
    submitStep,
    restartGame,
    updateRevealState,
    endGame,
  } = useGarticGameState({ initialRoomId });

  // The host ended the round: everyone follows back.
  const ended = gameState.phase === 'lobby';
  useEffect(() => {
    if (ended) handleBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const handleEndGame = () => {
    endGame();
    handleBack();
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
      }}
    >
      <GarticHeader
        onBack={handleBack}
        roomId={roomId}
        playerName={myPlayer?.name || myPlayerName}
        phase={gameState.phase}
        roundIndex={gameState.roundIndex}
        totalRounds={gameState.totalRounds}
        revealBookIndex={gameState.currentRevealBookIndex}
        totalBooks={gameState.books.length}
        isHost={isHost}
        onEndGame={handleEndGame}
      />

      {/* Main Game Screen */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 0.5, sm: 1 },
          overflow: taskType === 'drawing' || taskType === 'guessing' ? 'hidden' : 'auto',
        }}
      >
        {hasSubmitted && gameState.phase !== 'reveal' && gameState.phase !== 'finished' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 1, sm: 3 } }}>
            <GarticWaitingStatus state={gameState} myPlayerId={myPlayer?.id || myPlayerId} />
          </Box>
        ) : (
          <>
            {taskType === 'prompt' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 1, sm: 3 } }}>
                <GarticPromptStep
                  playerName={myPlayer?.name || myPlayerName}
                  onSubmitPrompt={submitStep}
                />
              </Box>
            )}

            {taskType === 'drawing' && previousStep && (
              <GarticDrawingStep
                promptText={previousStep.content}
                authorName={previousStep.authorName}
                onSubmitDrawing={submitStep}
              />
            )}

            {taskType === 'guessing' && previousStep && (
              <GarticGuessingStep
                canvasData={previousStep.content}
                authorName={previousStep.authorName}
                onSubmitGuess={submitStep}
              />
            )}

            {(gameState.phase === 'reveal' || gameState.phase === 'finished') && (
              <GarticAlbumReveal
                state={gameState}
                isHost={isHost}
                onRevealStateChange={updateRevealState}
                onRestartGame={restartGame}
                onBackToMenu={handleBack}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
