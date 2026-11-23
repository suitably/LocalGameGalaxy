/**
 * Imposter in a party room: every player's card on their own phone [ID: GAME-IMPOSTER-ROOM-VIEW]
 *
 * The host sets the round up and steers it; each device receives only its own sealed view
 * (`useImposterRoom`). A device without a seat is the table: phase, progress and the result.
 */
import React, { useCallback } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { PartyRoomConnecting } from '../../features/party/components/PartyRoomScoreboard';
import { GameSetup } from './components/GameSetup';
import { RoomCard } from './components/room/RoomCard';
import { RoomCountdown } from './components/room/RoomCountdown';
import { RoomResult } from './components/room/RoomResult';
import { RoomVote } from './components/room/RoomVote';
import { useImposterRoom } from './hooks/useImposterRoom';

export const ImposterRoomGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  usePageTitle(t('games.imposter.title'));
  const { view, dispatch, synced, isHost, dbReady, start, room } = useImposterRoom(roomId);
  const startVote = useCallback(() => dispatch({ type: 'START_VOTE' }), [dispatch]);

  if (!synced || !view) return <PartyRoomConnecting label={t('games.imposter.room.connecting')} />;
  const me = view.me;
  const progress = (count: number) => ({ count, total: view.players.length });

  const body = () => {
    switch (view.phase) {
      case 'SETUP':
        if (!isHost)
          return (
            <Typography textAlign="center">{t('games.imposter.room.waiting_setup')}</Typography>
          );
        return dbReady ? (
          <GameSetup players={view.players} onStartGame={(setup) => void start(setup)} />
        ) : (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        );
      case 'REVEAL':
        return (
          <>
            {me && (
              <RoomCard me={me} onSeen={() => dispatch({ type: 'SEEN', playerId: room.myId })} />
            )}
            <Typography color="text.secondary" textAlign="center">
              {t('games.imposter.room.seen_waiting', progress(view.seenCount))}
            </Typography>
          </>
        );
      case 'DISCUSS':
        return (
          <>
            {me && <RoomCard me={me} />}
            {view.discussEndsAt !== null && (
              <RoomCountdown
                endsAt={view.discussEndsAt}
                onTimeUp={isHost ? startVote : undefined}
              />
            )}
            <Typography color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
              {t('games.imposter.room.discuss_hint')}
            </Typography>
            {isHost && (
              <Box textAlign="center">
                <Button variant="contained" onClick={startVote} sx={{ minHeight: 48 }}>
                  {t('games.imposter.room.start_vote')}
                </Button>
              </Box>
            )}
          </>
        );
      case 'VOTING':
        return me ? (
          <RoomVote
            view={view}
            onVote={(target) => dispatch({ type: 'VOTE', playerId: room.myId, target })}
          />
        ) : (
          <Typography color="text.secondary" textAlign="center">
            {t('games.imposter.room.voted_waiting', progress(view.votedCount))}
          </Typography>
        );
      case 'RESULT':
        return view.result ? (
          <RoomResult
            view={view}
            result={view.result}
            onNewRound={isHost ? () => dispatch({ type: 'NEW_ROUND' }) : undefined}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ maxWidth: 'sm', mx: 'auto', py: 2 }}>
        {!me && view.phase !== 'SETUP' && (
          <Typography variant="overline" color="text.secondary" display="block" textAlign="center">
            {t('games.imposter.room.table_hint')}
          </Typography>
        )}
        {body()}
      </Box>
    </Box>
  );
};
