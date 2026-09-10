import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GarticPromptStep } from './components/GarticPromptStep';
import { GarticDrawingStep } from './components/GarticDrawingStep';
import { GarticGuessingStep } from './components/GarticGuessingStep';
import { GarticAlbumReveal } from './components/GarticAlbumReveal';
import { GarticWaitingStatus } from './components/GarticWaitingStatus';
import { GarticHeader } from './components/GarticHeader';
import { useGarticGameState } from './hooks/useGarticGameState';
import { useGarticSync } from './hooks/useGarticSync';

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
    myPlayerId,
    myPlayerName,
    myPlayer,
    isHost,
    taskType,
    previousStep,
    hasSubmitted,
    applyRemoteState,
    applyRemoteStep,
    applyPlayerJoin,
    submitStep,
    restartGame,
    updateRevealState,
    endGame,
  } = useGarticGameState({ initialRoomId });

  const getCurrentState = useCallback(() => gameState, [gameState]);

  const { broadcastState, broadcastStepSubmit, broadcastForceEnd } = useGarticSync({
    roomId: gameState.roomId,
    isHost,
    myPlayerId,
    myPlayerName,
    getCurrentState,
    onStateSync: applyRemoteState,
    onStepSubmit: applyRemoteStep,
    onPlayerJoin: applyPlayerJoin,
    onForceEnd: handleBack,
  });

  const handleStepSubmit = (content: string) => {
    if (!myPlayer) return;
    const result = submitStep(content);
    if (!result) return;

    broadcastStepSubmit(myPlayer.id, content);

    if (result.isRoundCompleted) {
      broadcastState(result.updatedState);
    }
  };

  const handleRevealStateChange = (bookIndex: number, stepIndex: number) => {
    const updated = updateRevealState(bookIndex, stepIndex);
    broadcastState(updated);
  };

  const handleRestart = () => {
    const restarted = restartGame();
    broadcastState(restarted);
  };

  const handleEndGame = () => {
    endGame();
    broadcastForceEnd();
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
        roomId={gameState.roomId}
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
            <GarticWaitingStatus
              state={gameState}
              myPlayerId={myPlayer?.id || myPlayerId}
            />
          </Box>
        ) : (
          <>
            {taskType === 'prompt' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 1, sm: 3 } }}>
                <GarticPromptStep
                  playerName={myPlayer?.name || myPlayerName}
                  onSubmitPrompt={handleStepSubmit}
                />
              </Box>
            )}

            {taskType === 'drawing' && previousStep && (
              <GarticDrawingStep
                promptText={previousStep.content}
                authorName={previousStep.authorName}
                onSubmitDrawing={handleStepSubmit}
              />
            )}

            {taskType === 'guessing' && previousStep && (
              <GarticGuessingStep
                canvasData={previousStep.content}
                authorName={previousStep.authorName}
                onSubmitGuess={handleStepSubmit}
              />
            )}

            {(gameState.phase === 'reveal' || gameState.phase === 'finished') && (
              <GarticAlbumReveal
                state={gameState}
                isHost={isHost}
                onRevealStateChange={handleRevealStateChange}
                onRestartGame={handleRestart}
                onBackToMenu={handleBack}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};
