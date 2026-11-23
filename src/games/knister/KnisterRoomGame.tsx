/**
 * Knister in a party room: every phone shows its own sheet [ID: GAME-KNISTER-ROOM-VIEW]
 *
 * The party host runs `knisterRoomReducer`; everyone rolls the shared dice and places the same
 * sum on their own sheet (`modules/room-game`).
 */
import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/titleContextCore';
import { GameLayout } from '../../components/Layout/GameLayout';
import { usePartyRoomGame } from '../../features/party/hooks/usePartyRoomGame';
import type { RoomPlayer } from '../../features/party/hooks/usePartyRoomPlayers';
import {
  PartyRoomConnecting,
  PartyRoomScoreboard,
} from '../../features/party/components/PartyRoomScoreboard';
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
import { KnisterSpectatorView } from './components/KnisterSpectatorView';
import { PartyHelpNotice } from '../../features/party/components/PartyHelpNotice';
import { PartySheetPicker } from '../../features/party/components/PartySheetPicker';
import { RoomMarkers } from '../../features/party/components/RoomMarkers';

initKnisterI18n();

const start = (hostId: string, players: RoomPlayer[]): KnisterRoomAction => ({
  type: 'START',
  hostId,
  players,
});
const needsStart = (state: KnisterRoomState) => state.players.length === 0;

export const KnisterRoomGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  usePageTitle(t('games.knister.title', 'Würfelgitter'));
  const { room, state, dispatch, dispatchFor, helpable, synced } = usePartyRoomGame({
    gameKey: 'knister',
    roomId,
    reducer: knisterRoomReducer,
    authorize: knisterRoomAllows,
    initialState: INITIAL_KNISTER_ROOM,
    needsStart,
    start,
  });
  const [overClosed, setOverClosed] = useState(false);

  // A device that may help others can play their sheet too (`PartySheetPicker`).
  const [sheetOf, setSheetOf] = useState(room.myId);
  const own = state.players.find((p) => p.id === room.myId);
  const helped = helpable.some((p) => p.id === sheetOf) ? sheetOf : room.myId;
  const me = state.players.find((p) => p.id === helped) ?? own;
  const forOther = me !== undefined && me.id !== room.myId;
  const roll = state.currentRoll;
  const iPlaced = me ? state.placed.includes(me.id) : false;
  const waitingFor = useMemo(
    () => state.players.filter((p) => !state.placed.includes(p.id)).map((p) => p.name),
    [state.players, state.placed],
  );

  let status = '';
  if (roll && !iPlaced && forOther)
    status = `${t('party.help.sheetOf', { name: me.name })}: ${t('games.knister.room_place', { sum: roll.sum })}`;
  else if (roll && !iPlaced) status = t('games.knister.room_place', { sum: roll.sum });
  else if (roll) status = t('games.knister.room_waiting', { names: waitingFor.join(', ') });
  else if (!state.isGameOver && state.rollCount > 0) status = t('games.knister.room_roll');

  return (
    <GameLayout maxWidth="sm">
      {!synced || (!me && state.players.length === 0) ? (
        <PartyRoomConnecting label={t('games.knister.room_connecting')} />
      ) : !me ? (
        <KnisterSpectatorView state={state} />
      ) : (
        <>
          <PartyHelpNotice roomId={roomId} myId={room.myId} players={room.players} />
          <RoomMarkers roomId={roomId} myId={room.myId} to={forOther ? me.id : 'all'} />
          <PartySheetPicker
            myId={room.myId}
            helpable={helpable.filter((p) => state.players.some((x) => x.id === p.id))}
            value={helped}
            onChange={setSheetOf}
          />
          <PartyRoomScoreboard
            myId={room.myId}
            entries={state.players.map((p) => ({
              id: p.id,
              name: p.name,
              score: calculateBoardScores(p.grid).totalScore,
              pending: Boolean(roll) && !state.placed.includes(p.id),
            }))}
          />

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
            <Typography textAlign="center" fontWeight={700} color="primary.text">
              {status}
            </Typography>
          )}

          <KnisterBoard
            grid={me.grid}
            currentSum={roll && !iPlaced ? roll.sum : null}
            onCellClick={(row, col) =>
              roll && !iPlaced && dispatchFor(me.id, { type: 'PLACE', row, col, playerId: me.id })
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
