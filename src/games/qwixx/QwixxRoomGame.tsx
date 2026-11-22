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

initQwixxI18n();

const start = (hostId: string, players: RoomPlayer[]): QwixxRoomAction => ({
  type: 'START',
  hostId,
  gameId: generateUUID(),
  players,
});
const needsStart = (state: QwixxRoomState) => state.players.length === 0;
const noop = () => {};

export const QwixxRoomGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  usePageTitle(t('games.qwixx.title', 'Qwixx'));
  const { room, state, dispatch, synced } = usePartyRoomGame({
    gameKey: 'qwixx',
    roomId,
    reducer: qwixxRoomReducer,
    authorize: qwixxRoomAllows,
    initialState: INITIAL_QWIXX_ROOM,
    needsStart,
    start,
  });
  const status = useQwixxRoomStatus(state, room.myId);

  if (!synced || state.players.length === 0)
    return (
      <GameLayout maxWidth="md">
        <PartyRoomConnecting label={t('games.qwixx.room_connecting')} />
      </GameLayout>
    );

  const isPlayer = state.players.some((p) => p.id === room.myId);
  return (
    <GameLayout maxWidth="md">
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
