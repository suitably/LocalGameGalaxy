import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { DrawingCanvas } from '../../../modules/drawing';
import { WordSelector } from './WordSelector';
import { GuessPanel } from './GuessPanel';
import { WaitingForDrawerView } from './WaitingForDrawerView';
import { WaitingForGuesserView } from './WaitingForGuesserView';
import { playerAssignment } from '../logic/playerAssignment';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

type SelectWordPayload = Parameters<React.ComponentProps<typeof WordSelector>['onSelectWord']>[0];

interface GuessArtRoundBodyProps {
  game: GuessArtGameRecord;
  round: GuessArtRound | null;
  gameLoading: boolean;
  isHost: boolean;
  isCurrentDrawerLocal: boolean;
  isCurrentGuesserLocal: boolean;
  onSelectWord: (payload: SelectWordPayload) => Promise<void>;
  onSubmitDrawing: (canvasData: string) => Promise<void>;
  onSubmitGuess: React.ComponentProps<typeof GuessPanel>['onSubmitGuess'];
  onRequestHint: React.ComponentProps<typeof GuessPanel>['onRequestHint'];
  onOpenCatalogue: () => void;
  onOpenShareLinks?: () => void;
  triggerLocalUpdate: () => void;
  refresh: () => Promise<void>;
}

const Spinner: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
    <CircularProgress />
  </Box>
);

/** Picks the view for the current round status (word choice, drawing, guessing, waiting). */
export const GuessArtRoundBody: React.FC<GuessArtRoundBodyProps> = ({
  game,
  round,
  gameLoading,
  isHost,
  isCurrentDrawerLocal,
  isCurrentGuesserLocal,
  onSelectWord,
  onSubmitDrawing,
  onSubmitGuess,
  onRequestHint,
  onOpenCatalogue,
  onOpenShareLinks,
  triggerLocalUpdate,
  refresh,
}) => {
  const onClaimPlayer = async (playerId: string) => {
    playerAssignment.claimTurnTemporary(game.id, playerId);
    triggerLocalUpdate();
    await refresh();
  };

  if (gameLoading && !round) return <Spinner />;
  if ((round?.status === 'selecting' || round?.status === 'drawing') && !isCurrentDrawerLocal) {
    return (
      <WaitingForDrawerView
        game={game}
        round={round}
        isHost={isHost}
        onOpenShareLinks={onOpenShareLinks}
        onClaimPlayer={onClaimPlayer}
      />
    );
  }
  if (round?.status === 'selecting') {
    return (
      <WordSelector
        currentRound={round}
        onSelectWord={onSelectWord}
        onOpenCatalogue={onOpenCatalogue}
        manualModeDefault={Boolean(game.options.manualWordMode)}
      />
    );
  }
  if (round?.status === 'drawing') {
    return (
      <DrawingCanvas
        initialCanvasData={round?.canvasData}
        onSubmit={onSubmitDrawing}
        loading={gameLoading}
      />
    );
  }
  if (round?.status === 'guessing' && !isCurrentGuesserLocal) {
    return (
      <WaitingForGuesserView
        game={game}
        round={round}
        isHost={isHost}
        onOpenShareLinks={onOpenShareLinks}
        onClaimPlayer={onClaimPlayer}
      />
    );
  }
  if (round?.status === 'guessing') {
    return (
      <GuessPanel
        currentRound={round}
        onSubmitGuess={onSubmitGuess}
        onRequestHint={onRequestHint}
      />
    );
  }
  return <Spinner />;
};
