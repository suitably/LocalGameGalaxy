/**
 * A player's own device in the stage's room [ID: GAME-MELODIQ-NOTES-PULT-HOOK]
 *
 * Joins the stage's room on a part, keeps a clock offset to the stage (ping/pong) and sends what
 * the player plays, stamped with the stage time. Judging happens on the stage.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoomEvents, useRoomReducer } from '../../../modules/room-game';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import {
  addSample,
  clockSample,
  estimateOffset,
  toStageTime,
  type ClockSample,
} from './logic/clockSync';
import {
  freePart,
  initialPultRoom,
  PULT_GAME_KEY,
  pultRoomAllows,
  pultRoomReducer,
  type PultEvent,
  type PultInput,
  type PultRoomAction,
  type PultRoomState,
} from './logic/protocol';

/** Pings quickly until the offset settles, then keeps it fresh. */
const FAST_PING_MS = 300;
const SLOW_PING_MS = 3000;
const SETTLED_SAMPLES = 5;

export function usePult(roomId: string, name: string, wantedPart: string | null) {
  const myId = useMemo(() => universalPartyManager.getMyPlayerId(), []);
  const initialState = useMemo(() => initialPultRoom(''), []);
  const { state, dispatch, synced } = useRoomReducer<PultRoomState, PultRoomAction>({
    gameKey: PULT_GAME_KEY,
    roomId,
    playerId: myId,
    isHost: false,
    reducer: pultRoomReducer,
    authorize: pultRoomAllows,
    initialState,
  });
  const me = state.members.find((m) => m.id === myId) ?? null;
  const part = state.song?.parts.find((p) => p.id === me?.partId) ?? null;

  const [samples, setSamples] = useState<ClockSample[]>([]);
  const clock = useMemo(() => estimateOffset(samples), [samples]);
  const sent = useRef(new Map<number, number>());
  const lastPing = useRef(0);
  const onEvent = useCallback(
    (ev: PultEvent) => {
      if (ev.kind !== 'pong' || ev.to !== myId) return;
      const t0 = sent.current.get(ev.id);
      // only answers to this page's own pings (MQTT may redeliver an old one)
      if (t0 === undefined || t0 !== ev.t0) return;
      sent.current.delete(ev.id);
      const s = clockSample(t0, ev.ts, performance.now());
      if (!s) return;
      setSamples((prev) => addSample(prev, s));
    },
    [myId],
  );
  const events = useRoomEvents<PultEvent>({ gameKey: PULT_GAME_KEY, roomId, onEvent });

  const settled = samples.length >= SETTLED_SAMPLES;
  useEffect(() => {
    const ping = () => {
      const id = ++lastPing.current;
      const t0 = performance.now();
      sent.current.set(id, t0);
      if (sent.current.size > 20) sent.current.delete(sent.current.keys().next().value ?? 0);
      events.send({ kind: 'ping', from: myId, id, t0 });
    };
    ping();
    const timer = setInterval(ping, settled ? SLOW_PING_MS : FAST_PING_MS);
    return () => clearInterval(timer);
  }, [events, myId, settled]);

  const join = useCallback(
    (partId: string) => {
      const p = state.song?.parts.find((x) => x.id === partId);
      if (p) dispatch({ type: 'JOIN', member: { id: myId, name, partId, inst: p.inst } });
    },
    [dispatch, myId, name, state.song],
  );

  // Take the offered part (or any free one) as soon as the stage's song is known.
  const offer = freePart(state, myId, wantedPart)?.id ?? null;
  const joined = me !== null;
  useEffect(() => {
    if (synced && !joined && offer) join(offer);
  }, [synced, joined, offer, join]);

  useEffect(() => {
    const leave = () => dispatch({ type: 'LEAVE', id: myId });
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [dispatch, myId]);

  const offset = clock?.offset ?? null;
  const play = useCallback(
    (input: PultInput) => {
      // without a clock the stage could not place the input in time
      if (offset === null) return;
      events.send({ kind: 'input', from: myId, input, at: toStageTime(performance.now(), offset) });
    },
    [events, myId, offset],
  );

  return { state, synced, me, part, clock, join, play };
}
