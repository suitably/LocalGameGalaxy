/**
 * Qwixx in a party room: own sheet on every device, shared dice and scoreboard
 * [ID: GAME-QWIXX-ROOM-VIEW]
 *
 * The party host runs `qwixxRoomReducer`. A device with a seat plays its own sheet
 * (`QwixxRoomPlayer`); a device without one is the table screen: scoreboard and dice only.
 */
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { GameLayout } from '../../components/Layout/GameLayout';
import { usePartyRoomGame } from '../../features/party/hooks/usePartyRoomGame';
import type { RoomPlayer } from '../../features/party/hooks/usePartyRoomPlayers';
import {
  PartyRoomConnecting,
  PartyRoomScoreboard,
} from '../../features/party/components/PartyRoomScoreboard';
import { generateUUID } from '../../lib/uuid';
import { initQwixxI18n } from './i18n';
import {
  closedRows,
  INITIAL_QWIXX_ROOM,
  qwixxRoomAllows,
  qwixxRoomReducer,
  type QwixxRoomAction,
  type QwixxRoomState,
} from './logic/qwixxRoom';
import { QwixxDiceRoller } from './components/QwixxDiceRoller';
import { QwixxRoomPlayer } from './components/QwixxRoomPlayer';
import { useQwixxRoomStatus } from './useQwixxRoomStatus';
import { PartyHelpNotice } from '../../features/party/components/PartyHelpNotice';
import { RoomMarkers } from '../../features/party/components/RoomMarkers';

initQwixxI18n();

const start = (hostId: string, players: RoomPlayer[]): QwixxRoomAction => ({
  type: 'START',
  hostId,
  gameId: generateUUID(),
  players,
});
const needsStart = (state: QwixxRoomState) => state.players.length === 0;
/** Whose action is awaited: the roller, until they rolled (a helper may roll for them). */
const actorOf = (state: QwixxRoomState) =>
  state.rolled || state.isGameOver ? null : (state.players[state.rollerIndex]?.id ?? null);
const noop = () => {};

export const QwixxRoomGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  usePageTitle(t('games.qwixx.title', 'Farbreihen'));
  const { room, state, dispatch, synced, actingFor } = usePartyRoomGame({
    gameKey: 'qwixx',
    roomId,
    reducer: qwixxRoomReducer,
    authorize: qwixxRoomAllows,
    initialState: INITIAL_QWIXX_ROOM,
    needsStart,
    start,
    actorOf,
  });
  const ownStatus = useQwixxRoomStatus(state, room.myId);
  const rollingFor = state.players.find((p) => p.id === actingFor);
  const status = rollingFor ? t('party.help.rollingFor', { name: rollingFor.name }) : ownStatus;

  if (!synced || state.players.length === 0)
    return (
      <GameLayout maxWidth="md">
        <PartyRoomConnecting label={t('games.qwixx.room_connecting')} />
      </GameLayout>
    );

  const isPlayer = state.players.some((p) => p.id === room.myId);
  return (
    <GameLayout maxWidth="md">
      <PartyHelpNotice roomId={roomId} myId={room.myId} players={room.players} />
      <RoomMarkers roomId={roomId} myId={room.myId} to={actingFor ?? 'all'} />
      <PartyRoomScoreboard
        myId={room.myId}
        entries={state.players.map((p) => ({
          id: p.id,
          name: p.name,
          score: state.boards[p.id]?.total ?? 0,
          pending: state.rolled && !state.done.includes(p.id),
        }))}
      />
      <Typography textAlign="center" fontWeight={700} color="primary.text" mb={1}>
        {status}
      </Typography>

      {isPlayer ? (
        <QwixxRoomPlayer
          key={state.gameId}
          roomId={roomId}
          myId={room.myId}
          state={state}
          dispatch={dispatch}
          rollForOther={actingFor !== null}
        />
      ) : (
        <QwixxDiceRoller
          dice={state.dice}
          isRolling={false}
          onRoll={noop}
          disabled
          removedDice={closedRows(state)}
        />
      )}

      {state.isGameOver && room.isHost && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => dispatch({ type: 'NEW_GAME', gameId: generateUUID() })}
            sx={{ minHeight: 44 }}
          >
            {t('games.qwixx.new_game', 'Neues Spiel')}
          </Button>
        </Box>
      )}
    </GameLayout>
  );
};
