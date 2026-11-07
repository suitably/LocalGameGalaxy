import React, { useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InvitePlayersButton } from '../../../features/party/components/InvitePlayersButton';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import { useWakeLock } from '../../../hooks/useWakeLock';
import { useGuessArtRoom } from '../hooks/useGuessArtRoom';
import { GuessArtRoundBody } from './GuessArtRoundBody';
import { RoundSuccessModal } from './RoundSuccessModal';
import { useFollowPartyLobby } from '../../../features/party/hooks/useFollowPartyLobby';

const noop = async () => {};

/** GuessArt played live in a party room: the room's players take turns, no names or links. */
export const GuessArtRoomGame: React.FC<{ roomId: string; language: string }> = ({
  roomId,
  language,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useFollowPartyLobby(roomId);
  useWakeLock(true);
  const live = useGuessArtRoom(roomId, language, false);
  const [dismissedRound, setDismissedRound] = useState(0);
  const { game, round, completed } = live.state;

  const backToParty = () => {
    if (live.isHost) universalPartyManager.returnToLobby(roomId);
    navigate(`/party?room=${roomId}`);
  };

  const showSuccess = Boolean(completed && completed.roundNumber > dismissedRound);
  const waiting = !live.synced || !game || !round;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ p: 1 }}>
        <Button size="small" startIcon={<ArrowBackRoundedIcon />} onClick={backToParty}>
          {t('guessart.roomBack', 'Zur Lobby')}
        </Button>
        <Box flex={1} />
        <InvitePlayersButton game="guessart" variant="icon" />
        <Chip size="small" color="primary" label={roomId} />
      </Stack>

      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1 }}>
        {waiting ? (
          <Stack alignItems="center" gap={2} py={6}>
            <CircularProgress />
            <Typography color="text.secondary" textAlign="center">
              {live.synced && live.isHost
                ? t('guessart.roomNeedTwo', 'Es werden mindestens 2 Spieler in der Lobby benötigt.')
                : t('guessart.roomConnecting', 'Verbinde mit dem Raum …')}
            </Typography>
          </Stack>
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
