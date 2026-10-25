/**
 * The stage's side of the pult room [ID: GAME-MELODIQ-NOTES-STAGE-ROOM]
 *
 * The stage hosts the room (`modules/room-game`): it publishes song and play state, seats the
 * pults that joined (between songs, never mid-play), answers clock pings and judges the pults'
 * input at the stage time it was played.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRoomEvents, useRoomReducer } from '../../../modules/room-game';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import type { StageEngine } from '../stage/engine/StageEngine';
import { playRemote, seatRemotes } from '../stage/engine/remote';
import {
  initialPultRoom,
  PULT_GAME_KEY,
  pultRoomAllows,
  pultRoomReducer,
  type PultEvent,
  type PultRoomAction,
  type PultRoomState,
} from './logic/protocol';
import { pultSongOf } from './logic/pultSong';
import { remoteLagSec } from './logic/remoteHits';

export function useStageRoom(engine: StageEngine, roomId: string) {
  const myId = useMemo(() => universalPartyManager.getMyPlayerId(), []);
  const version = useSyncExternalStore(engine.subscribe, engine.getVersion);
  const initialState = useMemo(() => initialPultRoom(myId), [myId]);
  const { state, dispatch } = useRoomReducer<PultRoomState, PultRoomAction>({
    gameKey: PULT_GAME_KEY,
    roomId,
    playerId: myId,
    isHost: true,
    reducer: pultRoomReducer,
    authorize: pultRoomAllows,
    initialState,
  });

  const song = engine.song;
  const pultSong = useMemo(() => (song ? pultSongOf(song) : null), [song]);
  const play = engine.state;
  useEffect(() => {
    dispatch({ type: 'STAGE', song: pultSong, play });
  }, [dispatch, pultSong, play, version]);

  // a pult joining mid-song gets its seat once the song is over or back at the start
  useEffect(() => {
    if (play === 'idle' || play === 'done') seatRemotes(engine, state.members);
  }, [engine, play, song, state.members]);

  const onEvent = useCallback(
    (ev: PultEvent, send: (ev: PultEvent) => void) => {
      if (ev.from === myId) return;
      if (ev.kind === 'ping')
        send({
          kind: 'pong',
          from: myId,
          to: ev.from,
          id: ev.id,
          t0: ev.t0,
          ts: performance.now(),
        });
      else if (ev.kind === 'input') {
        const lag = remoteLagSec(performance.now(), ev.at);
        if (lag !== null) playRemote(engine, ev.from, ev.input, lag);
      }
    },
    [engine, myId],
  );
  useRoomEvents<PultEvent>({ gameKey: PULT_GAME_KEY, roomId, onEvent });

  return { members: state.members };
}
