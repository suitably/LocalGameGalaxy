/**
 * A player's own device in the stage's room [ID: GAME-MELODIQ-NOTES-PULT-HOOK]
 *
 * Joins the stage's room on a part, keeps a clock offset to the stage (ping/pong), fetches the
 * part's notes, runs a `PultEngine` on the stage's clock and sends what it judged (`judged`) and
 * what was played (`input`, for the stage's display).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoomEvents, useRoomReducer } from '../../../modules/room-game';
import { universalPartyManager } from '../../../features/party/logic/universalPartyManager';
import { useStage } from '../stage/useStage';
import { addSample, clockSample, estimateOffset, type ClockSample } from './logic/clockSync';
import {
  freePart,
  initialPultRoom,
  PULT_GAME_KEY,
  pultRoomAllows,
  pultRoomReducer,
  type PultEvent,
  type PultRoomAction,
  type PultRoomState,
} from './logic/protocol';
import { PultEngine } from './PultEngine';

/** Pings quickly until the offset settles, then keeps it fresh. */
const FAST_PING_MS = 300;
const SLOW_PING_MS = 3000;
const SETTLED_SAMPLES = 5;
/** A missing chart is asked for again this often. */
const CHART_RETRY_MS = 1500;
/** Judgements are sent in batches this often (learn mode waits for them). */
const BATCH_MS = 60;
/** The stage answers a click request within this time or not at all. */
const CLICK_PLAN_TIMEOUT_MS = 3000;

export function usePult(roomId: string, name: string, wantedPart: string | null) {
  const myId = useMemo(() => universalPartyManager.getMyPlayerId(), []);
  const { engine, unlockAudio } = useStage(() => new PultEngine());
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
  const songKey = state.song?.key ?? null;
  // which chart the engine plays: `<song key>:<part id>`
  const [loaded, setLoaded] = useState<string | null>(null);
  const wanted = songKey && me ? `${songKey}:${me.partId}` : null;

  const [samples, setSamples] = useState<ClockSample[]>([]);
  const clock = useMemo(() => estimateOffset(samples), [samples]);
  const sent = useRef(new Map<number, number>());
  const clickPlans = useRef(new Map<number, (times: number[] | null) => void>());
  const lastPing = useRef(0);
  const hostId = state.hostId;
  const inst = me?.inst;
  const onEvent = useCallback(
    (ev: PultEvent) => {
      if (ev.kind === 'clock') {
        if (ev.from === hostId) engine.applyClock(ev);
        return;
      }
      if (ev.kind === 'click-plan') {
        if (ev.to === myId) clickPlans.current.get(ev.id)?.(ev.times);
        return;
      }
      if (ev.kind === 'chart') {
        if (ev.to !== myId || ev.from !== hostId) return;
        engine.loadChart(ev.chart, inst);
        setLoaded(`${ev.chart.songKey}:${ev.chart.part.id}`);
        return;
      }
      if (ev.kind !== 'pong' || ev.to !== myId) return;
      const t0 = sent.current.get(ev.id);
      // only answers to this page's own pings (MQTT may redeliver an old one)
      if (t0 === undefined || t0 !== ev.t0) return;
      sent.current.delete(ev.id);
      const s = clockSample(t0, ev.ts, performance.now());
      if (!s) return;
      setSamples((prev) => addSample(prev, s));
    },
    [engine, hostId, inst, myId],
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

  const offset = clock?.offset ?? null;
  useEffect(() => {
    engine.setOffset(offset);
  }, [engine, offset]);

  // ask for the part's notes until they are here
  const partId = me?.partId;
  useEffect(() => {
    if (!wanted || wanted === loaded || !songKey || !partId) return;
    const ask = () => events.send({ kind: 'chart-request', from: myId, songKey, partId });
    ask();
    const timer = setInterval(ask, CHART_RETRY_MS);
    return () => clearInterval(timer);
  }, [events, myId, wanted, loaded, songKey, partId]);

  // judgements in batches, what was played at once
  useEffect(() => {
    engine.setOnInput((input) => events.send({ kind: 'input', from: myId, input }));
    const timer = setInterval(() => {
      const batch = engine.takeBatch();
      if (batch && engine.songKey)
        events.send({ kind: 'judged', from: myId, songKey: engine.songKey, ...batch });
    }, BATCH_MS);
    return () => {
      engine.setOnInput(null);
      clearInterval(timer);
    };
  }, [engine, events, myId]);

  const join = useCallback(
    (id: string) => {
      const p = state.song?.parts.find((x) => x.id === id);
      if (p) dispatch({ type: 'JOIN', member: { id: myId, name, partId: id, inst: p.inst } });
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

  /** Tap-along calibration: the stage plays clicks; resolves with their stage times, null on no answer. */
  const requestClicks = useCallback(
    () =>
      new Promise<number[] | null>((resolve) => {
        const id = Date.now();
        const done = (times: number[] | null) => {
          clickPlans.current.delete(id);
          resolve(times);
        };
        clickPlans.current.set(id, done);
        setTimeout(() => done(null), CLICK_PLAN_TIMEOUT_MS);
        events.send({ kind: 'click-request', from: myId, id });
      }),
    [events, myId],
  );

  return {
    engine,
    unlockAudio,
    state,
    synced,
    me,
    part,
    clock,
    ready: wanted !== null && wanted === loaded,
    join,
    offset,
    requestClicks,
  };
}
