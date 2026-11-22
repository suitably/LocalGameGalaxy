/**
 * Werewolf in a party room: every role on its owner's phone, the host narrates
 * [ID: GAME-WEREWOLF-ROOM-PAGE]
 *
 * The host sets the game up and its device speaks the narration (`useWerewolfRoom`); each
 * device receives only its own sealed view. A device without a seat (the narrator, a TV) shows
 * the table: phase, who is called, deaths and finally every role.
 */
import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffIcon from '@mui/icons-material/VolumeOffRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { PartyRoomConnecting } from '../../features/party/components/PartyRoomScoreboard';
import { GameOver } from './components/GameOver';
import { RoomDay } from './components/room/RoomDay';
import { RoomNight } from './components/room/RoomNight';
import { RoomRoles } from './components/room/RoomRoles';
import { RoomRoleCard } from './components/room/RoomRoleCard';
import { RoomSetup } from './components/room/RoomSetup';
import { useWerewolfRoom } from './hooks/useWerewolfRoom';

export const WerewolfRoomGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  usePageTitle(t('games.werewolf.title'));
  const { view, dispatch, synced, isHost, myId, tts, start, nightAction, nightSkip } =
    useWerewolfRoom(roomId);

  if (!synced || !view) return <PartyRoomConnecting label={t('games.werewolf.room.connecting')} />;
  const me = view.me;

  const body = () => {
    switch (view.phase) {
      case 'SETUP':
        return isHost ? (
          <RoomSetup roster={view.roster} hostId={myId} onStart={start} />
        ) : (
          <Typography textAlign="center">{t('games.werewolf.room.waiting_setup')}</Typography>
        );
      case 'ROLE_REVEAL':
        return (
          <>
            {me && (
              <RoomRoleCard
                view={view}
                me={me}
                onSeen={() => dispatch({ type: 'SEEN', playerId: myId })}
              />
            )}
            <Typography color="text.secondary" textAlign="center">
              {t('games.werewolf.room.seen_waiting', {
                count: view.seenCount,
                total: view.players.length,
              })}
            </Typography>
          </>
        );
      case 'NIGHT':
        return <RoomNight view={view} onAction={nightAction} onSkip={nightSkip} />;
      case 'DAY':
      case 'VOTING':
      case 'HUNTER_SHOT':
        return (
          <RoomDay
            view={view}
            onStartVote={isHost ? () => dispatch({ type: 'START_VOTE' }) : undefined}
            onVote={(target) => dispatch({ type: 'VOTE', playerId: myId, target })}
            onShoot={(targetId) => dispatch({ type: 'HUNTER_SHOT', playerId: myId, targetId })}
          />
        );
      case 'GAME_OVER':
        return view.winner ? (
          <GameOver
            winner={view.winner}
            onPlayAgain={isHost ? () => dispatch({ type: 'NEW_GAME' }) : undefined}
          >
            {view.result && <RoomRoles view={view} roles={view.result.roles} />}
          </GameOver>
        ) : null;
      default:
        return null;
    }
  };

  const inGame = view.phase !== 'SETUP' && view.phase !== 'ROLE_REVEAL';
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ maxWidth: 'sm', mx: 'auto', py: 2 }}>
        {isHost && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              onClick={() => tts.setEnabled(!tts.enabled)}
              color={tts.enabled ? 'primary' : 'default'}
              aria-label={t('games.werewolf.ui.toggle_narrator')}
            >
              {tts.enabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>
          </Box>
        )}
        {!me && view.phase !== 'SETUP' && (
          <Typography variant="overline" color="text.secondary" display="block" textAlign="center">
            {t('games.werewolf.room.table_hint')}
          </Typography>
        )}
        {body()}
        {me && inGame && view.phase !== 'GAME_OVER' && !me.turn && (
          <Box sx={{ mt: 4 }}>
            <RoomRoleCard view={view} me={me} />
          </Box>
        )}
      </Box>
    </Box>
  );
};
