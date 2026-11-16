import React from 'react';
import { Box } from '@mui/material';
import { GuessArtRoundBody } from './GuessArtRoundBody';
import { RoundSuccessModal } from './RoundSuccessModal';
import { useGuessArtHeader } from '../hooks/useGuessArtHeader';
import { PlayerJoinedSnackbar } from '../../../modules/player-management/PlayerJoinedSnackbar';
import type { useCompletedRound } from '../hooks/useCompletedRound';
import type { useGuessArtGame } from '../hooks/useGuessArtGame';
import type { useGuessArtTurnSeat } from '../hooks/useGuessArtTurnSeat';
import type { GuessArtGameRecord, GuessArtRound } from '../logic/types';

type GameApi = ReturnType<typeof useGuessArtGame>;

interface GuessArtSessionViewProps {
  game: GuessArtGameRecord;
  round: GuessArtRound | null;
  gameLoading: boolean;
  language: string;
  seat: ReturnType<typeof useGuessArtTurnSeat>;
  completedRound: ReturnType<typeof useCompletedRound>;
  actions: Pick<GameApi, 'selectWord' | 'submitDrawing' | 'requestHint' | 'refresh'>;
  joinedNames: string[];
  onClearJoined: () => void;
  onExit: () => void;
  onOpenHistory: () => void;
  onEditGame: () => void;
  onOpenCatalogue: () => void;
  onOpenShareLinks: () => void;
  /** Dialogs rendered inside the session container. */
  children?: React.ReactNode;
}

/** Layout of a running GuessArt game: global-header wiring, round view, success modal and dialogs. */
export const GuessArtSessionView: React.FC<GuessArtSessionViewProps> = ({
  game,
  round,
  gameLoading,
  language,
  seat,
  completedRound,
  actions,
  joinedNames,
  onClearJoined,
  onExit,
  onOpenHistory,
  onEditGame,
  onOpenCatalogue,
  onOpenShareLinks,
  children,
}) => {
  const { completed } = completedRound;
  const shareHandler = seat.isHost ? onOpenShareLinks : undefined;
  useGuessArtHeader({
    game,
    round,
    isHost: seat.isHost,
    isCurrentTurnLocal: seat.isCurrentTurnLocal,
    isTemporaryTurn: seat.isTemporaryTurn,
    onToggleLocalRemote: seat.handleToggleLocalRemote,
    onExit,
    onOpenHistory,
    onEditGame,
    onOpenShareLinks,
  });
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
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 0.5, sm: 1.5 },
        }}
      >
        <GuessArtRoundBody
          game={game}
          round={round}
          gameLoading={gameLoading}
          isHost={seat.isHost}
          isCurrentDrawerLocal={seat.isCurrentDrawerLocal}
          isCurrentGuesserLocal={seat.isCurrentGuesserLocal}
          onSelectWord={actions.selectWord}
          onSubmitDrawing={actions.submitDrawing}
          onSubmitGuess={completedRound.handleGuessSubmit}
          onRequestHint={actions.requestHint}
          onOpenCatalogue={onOpenCatalogue}
          onOpenShareLinks={shareHandler}
          triggerLocalUpdate={seat.triggerLocalUpdate}
          refresh={actions.refresh}
        />
      </Box>

      <RoundSuccessModal
        open={completedRound.open}
        word={completed?.word ?? ''}
        originalWord={completed?.originalWord}
        originalLanguage={completed?.originalLang}
        roundNumber={completed?.roundNumber ?? 1}
        guessesCount={completed?.guessesCount ?? 0}
        guesses={completed?.guesses ?? []}
        drawerName={completed?.drawerName}
        guesserName={completed?.guesserName}
        language={language}
        onNextRound={completedRound.handleNextRound}
      />

      <PlayerJoinedSnackbar names={joinedNames} onClose={onClearJoined} />
      {children}
    </Box>
  );
};
