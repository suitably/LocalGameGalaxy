/**
 * Kniffel in a party room: shared dice and score sheet on every device [ID: GAME-KNIFFEL-ROOM-VIEW]
 *
 * The party host runs `kniffelRoomReducer`; the player whose turn it is rolls and scores on their
 * own device, everyone else watches the same dice and sheet. A device without a seat is the table
 * screen (read-only).
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
import { PartyHelpNotice } from '../../features/party/components/PartyHelpNotice';
import { RoomMarkers } from '../../features/party/components/RoomMarkers';
import { initKniffelI18n } from './i18n';
import {
  INITIAL_KNIFFEL_ROOM,
  kniffelRoomAllows,
  kniffelRoomReducer,
  rulesChangeable,
  type KniffelRoomAction,
  type KniffelRoomState,
} from './logic/kniffelRoom';
import { evaluatePossibleScores, getTotalScore } from './logic/kniffelScoring';
import { KniffelBoard } from './components/KniffelBoard';
import { KniffelDiceRoller } from './components/KniffelDiceRoller';
import { KniffelRulesPicker } from './components/KniffelRulesPicker';
import { loadKniffelRoomRules } from './components/kniffelRulesStorage';

initKniffelI18n();

const start = (hostId: string, players: RoomPlayer[]): KniffelRoomAction => ({
  type: 'START',
  hostId,
  players,
  rules: loadKniffelRoomRules(),
});
const needsStart = (state: KniffelRoomState) => state.players.length === 0;
const actorOf = (state: KniffelRoomState) =>
  state.isGameOver ? null : (state.players[state.activePlayerIndex]?.id ?? null);
const noop = () => {};

export const KniffelRoomGame: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { t } = useTranslation();
  usePageTitle(t('games.kniffel.title', 'Kniffel'));
  const { room, state, dispatch, synced, canAct, actingFor } = usePartyRoomGame({
    gameKey: 'kniffel',
    roomId,
    reducer: kniffelRoomReducer,
    authorize: kniffelRoomAllows,
    initialState: INITIAL_KNIFFEL_ROOM,
    needsStart,
    start,
    actorOf,
  });

  if (!synced || state.players.length === 0)
    return (
      <GameLayout maxWidth="md">
        <PartyRoomConnecting label={t('games.kniffel.room_connecting')} />
      </GameLayout>
    );

  const active = state.players[state.activePlayerIndex];
  const rules = state.rules ?? 'kniffel';
  const myTurn = canAct;
  const status = state.isGameOver
    ? t('games.kniffel.game_over', 'Spiel beendet!')
    : actingFor
      ? t('games.kniffel.room_playing_for', { name: active?.name ?? '' })
      : myTurn
        ? t('games.kniffel.room_your_turn')
        : t('games.kniffel.room_turn_of', { name: active?.name ?? '' });

  return (
    <GameLayout maxWidth="md">
      <PartyHelpNotice roomId={roomId} myId={room.myId} players={room.players} />
      <RoomMarkers
        roomId={roomId}
        myId={room.myId}
        to={active && active.id !== room.myId && !state.isGameOver ? active.id : 'all'}
      />
      <PartyRoomScoreboard
        myId={room.myId}
        entries={state.players.map((p) => ({
          id: p.id,
          name: p.name,
          score: getTotalScore({ ...p.scores }, rules),
          pending: p.id === active?.id && !state.isGameOver,
        }))}
      />
      <Typography textAlign="center" fontWeight={700} color="primary.text" mb={1}>
        {status}
      </Typography>

      {room.isHost && rulesChangeable(state) && (
        <KniffelRulesPicker rules={rules} onChange={(r) => dispatch({ type: 'RULES', rules: r })} />
      )}

      <KniffelDiceRoller
        dice={state.dice}
        heldDice={state.heldDice}
        rollCount={state.rollCount}
        onRoll={(dice) => dispatch({ type: 'ROLL', dice })}
        onToggleHold={(index) => dispatch({ type: 'HOLD', index })}
        disabled={!myTurn}
      />

      <KniffelBoard
        players={state.players}
        activePlayerIndex={state.activePlayerIndex}
        possibleScores={evaluatePossibleScores(state.dice, rules, active?.scores)}
        rules={rules}
        rollCount={state.rollCount}
        onScoreCategory={(category, score) => dispatch({ type: 'SCORE', category, score })}
        onSwitchPlayer={noop}
        disabled={!myTurn}
        showDice
      />

      {state.isGameOver && room.isHost && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => dispatch({ type: 'NEW_GAME' })}
            sx={{ minHeight: 44 }}
          >
            {t('games.kniffel.play_again', 'Nochmal spielen')}
          </Button>
        </Box>
      )}
    </GameLayout>
  );
};
