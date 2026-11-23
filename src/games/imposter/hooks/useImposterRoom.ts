/**
 * Imposter in a party room: sealed game plus the host's chores [ID: HOOK-IMPOSTER-ROOM]
 *
 * The host keeps the roster in step during setup, draws word and imposters when the round
 * starts, and opens the discussion once every player has seen their card.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSealedPartyGame } from '../../../features/party/hooks/useSealedPartyGame';
import type { SealedGame } from '../../../modules/room-game/sealed/sealedRoomPeer';
import { seedImposterDatabase } from '../logic/dbSeeder';
import {
  INITIAL_IMPOSTER_ROOM,
  drawImposters,
  imposterRoomAllows,
  imposterRoomReducer,
  imposterRoomView,
  type ImposterRoomAction,
  type ImposterRoomState,
  type ImposterRoomView,
} from '../logic/imposterRoom';
import { pickWordPair } from '../logic/pickWordPair';
import type { ImposterStartOptions } from './useImposterSetupState';

const GAME: SealedGame<ImposterRoomState, ImposterRoomAction, ImposterRoomView> = {
  reducer: imposterRoomReducer,
  allows: imposterRoomAllows,
  playerIds: (state) => state.players.map((p) => p.id),
  viewFor: imposterRoomView,
};

export function useImposterRoom(roomId: string) {
  const { i18n } = useTranslation();
  const { room, view, dispatch, synced } = useSealedPartyGame({
    gameKey: 'imposter',
    roomId,
    game: GAME,
    initialState: INITIAL_IMPOSTER_ROOM,
  });
  const isHost = room.isHost;
  const [dbReady, setDbReady] = useState(!isHost);

  useEffect(() => {
    if (!isHost) return;
    void seedImposterDatabase().then(() => setDbReady(true));
  }, [isHost]);

  // The roster follows the room until a round starts (the reducer ignores it afterwards).
  const roster = room.players;
  useEffect(() => {
    if (isHost && roster.length > 0)
      dispatch({ type: 'SETUP', hostId: room.myId, players: roster });
  }, [isHost, room.myId, roster, dispatch]);

  // Everyone has seen their card: the discussion starts on the host's clock.
  const allSeen = !!view && view.phase === 'REVEAL' && view.seenCount >= view.players.length;
  useEffect(() => {
    if (isHost && allSeen) dispatch({ type: 'DISCUSS', at: Date.now() });
  }, [isHost, allSeen, dispatch]);

  const start = useCallback(
    async (setup: ImposterStartOptions) => {
      if (!view) return;
      const drawn = await pickWordPair(setup.categories, i18n.language);
      if (!drawn) return;
      const ids = view.players.map((p) => p.id);
      dispatch({
        type: 'START',
        ...drawn,
        imposterIds: drawImposters(ids, setup.imposterCount),
        timerLength: setup.timerLength,
      });
    },
    [view, i18n.language, dispatch],
  );

  return { room, view, dispatch, synced, isHost, dbReady, start };
}
