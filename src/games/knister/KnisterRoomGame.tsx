/**
 * Knister in a party room: every phone shows its own sheet [ID: GAME-KNISTER-ROOM-VIEW]
 *
 * The party host runs `knisterRoomReducer`; everyone rolls the shared dice and places the same
 * sum on their own sheet (`modules/room-game`).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { useWakeLock } from '../../hooks/useWakeLock';
import { GameLayout } from '../../components/Layout/GameLayout';
import { useRoomReducer } from '../../modules/room-game';
import { usePartyRoomPlayers } from '../../features/party/hooks/usePartyRoomPlayers';
import { universalPartyManager } from '../../features/party/logic/universalPartyManager';
import { initKnisterI18n } from './i18n';
import {
  INITIAL_KNISTER_ROOM,
  knisterRoomAllows,
  knisterRoomReducer,
  type KnisterRoomAction,
  type KnisterRoomState,
} from './logic/knisterRoom';
import { calculateBoardScores } from './logic/knisterScoring';
import { KnisterBoard } from './components/KnisterBoard';
import { KnisterDiceRoller } from './components/KnisterDiceRoller';
import { KnisterGameOverModal } from './components/KnisterGameOverModal';

initKnisterI18n();

export const KnisterRoomGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  usePageTitle(t('games.knister.title', 'Knister'));
  useWakeLock(true);
  const room = usePartyRoomPlayers(roomId);
  const { state, dispatch, synced } = useRoomReducer<KnisterRoomState, KnisterRoomAction>({
    gameKey: 'knister',
    roomId,
    playerId: room.myId,
    isHost: room.isHost,
    reducer: knisterRoomReducer,
    authorize: knisterRoomAllows,
    initialState: INITIAL_KNISTER_ROOM,
  });
  const [overClosed, setOverClosed] = useState(false);

  // The host deals the sheets once the room's players are known.
  const roster = room.players;
  useEffect(() => {
    if (room.isHost && state.players.length === 0 && roster.length > 0)
      dispatch({ type: 'START', hostId: room.myId, players: roster });
  }, [room.isHost, room.myId, roster, state.players.length, dispatch]);

  const me = state.players.find((p) => p.id === room.myId);
  const roll = state.currentRoll;
  const iPlaced = state.placed.includes(room.myId);
  const waitingFor = useMemo(
    () => state.players.filter((p) => !state.placed.includes(p.id)).map((p) => p.name),
    [state.players, state.placed],
  );

  const backToParty = () => {
    if (room.isHost) universalPartyManager.returnToLobby(roomId);
    navigate(`/party?room=${roomId}`);
  };

  let status = '';
  if (roll && !iPlaced) status = t('games.knister.room_place', { sum: roll.sum });
  else if (roll) status = t('games.knister.room_waiting', { names: waitingFor.join(', ') });
  else if (!state.isGameOver && state.rollCount > 0) status = t('games.knister.room_roll');

  return (
    <GameLayout maxWidth="sm">
      <Stack direction="row" alignItems="center" gap={1} mb={1}>
        <Button size="small" startIcon={<ArrowBackRoundedIcon />} onClick={backToParty}>
          {t('games.knister.room_back')}
        </Button>
        <Box flex={1} />
        <Chip size="small" color="primary" label={roomId} />
      </Stack>

      {!synced || (!me && state.players.length === 0) ? (
        <Stack alignItems="center" gap={2} py={6}>
          <CircularProgress />
          <Typography color="text.secondary">{t('games.knister.room_connecting')}</Typography>
        </Stack>
      ) : !me ? (
        <Typography color="text.secondary" textAlign="center" py={6}>
          {t('games.knister.room_not_in_game')}
        </Typography>
      ) : (
        <>
          <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent="center" mb={1}>
            {state.players.map((p) => (
              <Chip
                key={p.id}
                size="small"
                variant={p.id === room.myId ? 'filled' : 'outlined'}
                color={roll && !state.placed.includes(p.id) ? 'warning' : 'default'}
                label={`${p.name} · ${calculateBoardScores(p.grid).totalScore}`}
              />
            ))}
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <KnisterDiceRoller
              currentRoll={roll}
              rollCount={state.rollCount}
              rollHistory={state.rollHistory}
              onRoll={(die1, die2) => dispatch({ type: 'ROLL', die1, die2 })}
              disabled={state.isGameOver || Boolean(roll)}
            />
          </Box>

          {status && (
            <Typography textAlign="center" fontWeight={700} color="primary.main">
              {status}
            </Typography>
          )}

          <KnisterBoard
            grid={me.grid}
            currentSum={roll && !iPlaced ? roll.sum : null}
            onCellClick={(row, col) =>
              roll && !iPlaced && dispatch({ type: 'PLACE', row, col, playerId: room.myId })
            }
            disabled={state.isGameOver || !roll || iPlaced}
          />
        </>
      )}

      <KnisterGameOverModal
        open={state.isGameOver && !overClosed}
        players={state.players}
        highScore={state.highScore}
        onNewGame={() => {
          setOverClosed(false);
          dispatch({ type: 'NEW_GAME' });
        }}
        onClose={() => setOverClosed(true)}
      />
    </GameLayout>
  );
};
