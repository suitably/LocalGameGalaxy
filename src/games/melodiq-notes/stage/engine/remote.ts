/**
 * Players on their own device (pults) on the stage engine [ID: GAME-MELODIQ-NOTES-STAGE-REMOTE]
 *
 * A pult judges its player; the stage seats it, shows what it plays and merges its judgements.
 */
import { applyJudged, mergeRemoteSeats } from '../../pult/logic/remoteHits';
import type {
  JudgedMark,
  PultInput,
  PultMember,
  PultScore,
  StageClock,
} from '../../pult/logic/protocol';
import { lowerBound } from '../logic/charts';
import { flashLane } from './input';
import { createPlayers, MAX_PLAYERS } from './players';
import type { StageEngine } from './StageEngine';
import type { PlayerSeat, StagePlayer } from './types';

const sameSeat = (a: PlayerSeat, b: PlayerSeat) =>
  a.partId === b.partId && a.inst === b.inst && a.remoteId === b.remoteId;

/**
 * Seats the pults in the room (see mergeRemoteSeats). Between songs the stage starts over; during
 * a song the other players keep their progress and a new pult plays from the current beat.
 */
export function seatRemotes(e: StageEngine, members: PultMember[]) {
  const song = e.song;
  if (!song) return;
  const next = mergeRemoteSeats(e.seats, members, MAX_PLAYERS);
  if (JSON.stringify(next) === JSON.stringify(e.seats)) return;
  if (e.state === 'idle' || e.state === 'done') {
    e.seats = next;
    return e.reset();
  }
  const kept = new Map<PlayerSeat, StagePlayer>();
  e.seats.forEach((s, i) => {
    const p = e.players[i];
    const same = next.find((n) => sameSeat(n, s));
    if (p && same) kept.set(same, p);
  });
  e.seats = next;
  e.players = next.flatMap((seat, i) => {
    const old = kept.get(seat);
    const p = old ?? createPlayers(song, [seat], e.sections.length, e.startBeat)[0];
    if (!p) return [];
    if (!old) p.missIdx = lowerBound(p.notes, e.beat);
    p.no = i + 1;
    p.name = seat.name;
    return [p];
  });
  if (!e.focus || !e.players.includes(e.focus))
    e.focus = e.players.find((p) => !p.remoteId) ?? null;
  // the band plays the parts nobody plays, which just changed
  e.setBand(e.band);
}

const lastSeq = new WeakMap<StagePlayer, number>();

/** A pult's batch of judgements; ignored when it belongs to another song or came out of order. */
export function applyRemoteJudged(
  e: StageEngine,
  remoteId: string,
  batch: { seq: number; marks: JudgedMark[]; score: PultScore },
) {
  const p = e.players.find((x) => x.remoteId === remoteId);
  if (!p || batch.seq <= (lastSeq.get(p) ?? -1)) return;
  lastSeq.set(p, batch.seq);
  if (applyJudged(p, batch.marks, batch.score, e.judge)) e.notifyLive();
}

/** What a pult's player played, for the stage's display only (key flashes, sung pitch). */
export function showRemoteInput(e: StageEngine, remoteId: string, input: PultInput) {
  const p = e.players.find((x) => x.remoteId === remoteId);
  if (!p) return;
  if (input.kind === 'voice') {
    p.voice = { pitch: input.pitch ?? p.voice.pitch, singing: input.pitch !== null };
    return;
  }
  flashLane(p, input.lane);
}

/** The transport a pult follows; `rate` is 0 while the beat stands (paused, learn mode waiting). */
export function stageClockOf(e: StageEngine, songKey: string, at: number): StageClock {
  const moving = e.state === 'playing' && !e.waitingFor;
  return {
    songKey,
    at,
    beat: e.beat,
    startBeat: e.startBeat,
    rate: moving ? 1 / e.secPerBeat(Math.max(0, e.beat)) : 0,
    play: e.state,
    mode: e.mode,
    loop: e.loop,
  };
}
