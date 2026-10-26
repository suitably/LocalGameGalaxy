/**
 * The stage's side of the pult room [ID: GAME-MELODIQ-NOTES-STAGE-ROOM]
 *
 * The stage hosts the room (`modules/room-game`): it publishes song and play state, seats the
 * pults that joined (at once, also mid-song), sends its transport as `clock`, answers clock pings,
 * chart requests and calibration click requests, shows what pults play and merges what they judged.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRoomEvents, useRoomReducer } from '../../../modules/room-game';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import type { StageEngine } from '../stage/engine/StageEngine';
import { playCalibrationClicks } from '../stage/engine/calibrationClicks';
import {
  applyRemoteJudged,
  seatRemotes,
  showRemoteInput,
  stageClockOf,
} from '../stage/engine/remote';
import {
  initialPultRoom,
  PULT_GAME_KEY,
  pultRoomAllows,
  pultRoomReducer,
  type PultEvent,
  type PultRoomAction,
  type PultRoomState,
} from './logic/protocol';
import { packChart, pultSongOf } from './logic/pultSong';

/** While idle the clock is repeated this often, so a pult that just joined gets it. */
const CLOCK_HEARTBEAT_MS = 2000;

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
  const songKey = pultSong?.key ?? null;
  const play = engine.state;
  useEffect(() => {
    dispatch({ type: 'STAGE', song: pultSong, play });
  }, [dispatch, pultSong, play, version]);

  // a pult gets its seat as soon as it joins, also mid-song
  useEffect(() => {
    seatRemotes(engine, state.members);
  }, [engine, song, version, state.members]);

  const onEvent = useCallback(
    (ev: PultEvent, send: (ev: PultEvent) => void) => {
      if (ev.from === myId) return;
      switch (ev.kind) {
        case 'ping':
          return send({
            kind: 'pong',
            from: myId,
            to: ev.from,
            id: ev.id,
            t0: ev.t0,
            ts: performance.now(),
          });
        case 'chart-request': {
          const chart = engine.song && ev.songKey === songKey && packChart(engine.song, ev.partId);
          if (chart) send({ kind: 'chart', from: myId, to: ev.from, chart });
          return;
        }
        case 'judged':
          if (ev.songKey === songKey) applyRemoteJudged(engine, ev.from, ev);
          return;
        case 'input':
          return showRemoteInput(engine, ev.from, ev.input);
        case 'click-request': {
          // stage time is this device's performance.now(), the clock the pult syncs to
          const times = playCalibrationClicks(engine);
          if (times) send({ kind: 'click-plan', from: myId, to: ev.from, id: ev.id, times });
          return;
        }
      }
    },
    [engine, myId, songKey],
  );
  const events = useRoomEvents<PultEvent>({ gameKey: PULT_GAME_KEY, roomId, onEvent });

  // the transport goes out on every change and a few times per second while playing
  useEffect(() => {
    if (!songKey) return;
    const sendClock = () =>
      events.send({
        kind: 'clock',
        from: myId,
        ...stageClockOf(engine, songKey, performance.now()),
      });
    sendClock();
    const unsubscribe = engine.subscribeLive(sendClock);
    const timer = setInterval(sendClock, CLOCK_HEARTBEAT_MS);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [engine, events, myId, songKey]);

  /** Sends a pult's player away (their seat goes back to the stage). */
  const remove = useCallback((id: string) => dispatch({ type: 'LEAVE', id }), [dispatch]);

  return { members: state.members, remove };
}
