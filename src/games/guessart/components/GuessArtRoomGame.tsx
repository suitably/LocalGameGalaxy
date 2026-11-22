import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InvitePlayersButton } from '../../../features/party/components/InvitePlayersButton';
import { usePageTitle } from '../../../context/TitleContext';
import { useHeaderLayout } from '../../../context/HeaderLayoutContext';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { useGuessArtRoom } from '../hooks/useGuessArtRoom';
import { GuessArtRoundBody } from './GuessArtRoundBody';
import { RoundSuccessModal } from './RoundSuccessModal';
import { GuessArtSpectatorView } from './GuessArtSpectatorView';
import { useFollowPartyLobby } from '../../../features/party/hooks/useFollowPartyLobby';

const noop = async () => {};

/** GuessArt played live in a party room: the room's players take turns, no names or links. */
export const GuessArtRoomGame: React.FC<{ roomId: string; language: string }> = ({
  roomId,
  language,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle(t('games.guessart.title'));
  const { setHomeAction, setCustomHeaderActions } = useHeaderLayout();
  useFollowPartyLobby(roomId);
  useWakeLock(true);
  const live = useGuessArtRoom(roomId, language, false);
  const [dismissedRound, setDismissedRound] = useState(0);
  const { game, round, completed } = live.state;

  // Header back arrow = lobby; the game goes on while this device visits it (#657).
  useEffect(() => {
    setHomeAction(() => navigate(`/party?room=${roomId}`));
    setCustomHeaderActions(<InvitePlayersButton game="guessart" variant="icon" />);
    return () => {
      setHomeAction(null);
      setCustomHeaderActions(null);
    };
  }, [navigate, roomId, setHomeAction, setCustomHeaderActions]);

  const showSuccess = Boolean(completed && completed.roundNumber > dismissedRound);
  const waiting = !live.synced || !game || !round;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1 }}>
        {waiting ? (
          <Stack alignItems="center" gap={2} py={6}>
            <CircularProgress />
            <Typography color="text.secondary" textAlign="center">
              {live.synced && live.isHost
                ? t('guessart.roomNeedTwo')
                : t('guessart.roomConnecting')}
            </Typography>
          </Stack>
        ) : !game.players.some((p) => p.id === live.myId) ? (
          <GuessArtSpectatorView game={game} round={round} />
        ) : (
          <GuessArtRoundBody
            game={game}
            round={round}
            gameLoading={false}
            isHost={false}
            isCurrentDrawerLocal={live.isDrawer}
            isCurrentGuesserLocal={live.isGuesser}
            onSelectWord={live.selectWord}
            onSubmitDrawing={live.submitDrawing}
            onSubmitGuess={live.submitGuess}
            onRequestHint={live.requestHint}
            triggerLocalUpdate={() => {}}
            refresh={noop}
          />
        )}
      </Box>

      <RoundSuccessModal
        open={showSuccess}
        word={completed?.word ?? ''}
        originalWord={completed?.originalWord}
        originalLanguage={completed?.originalLang}
        roundNumber={completed?.roundNumber ?? 1}
        guessesCount={completed?.guessesCount ?? 0}
        guesses={completed?.guesses ?? []}
        drawerName={completed?.drawerName}
        guesserName={completed?.guesserName}
        language={language}
        onNextRound={() => setDismissedRound(completed?.roundNumber ?? 0)}
      />
    </Box>
  );
};
