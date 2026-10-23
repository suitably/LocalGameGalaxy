import { lowerBound, type Judgement, type StageNote } from '../logic/charts';
import { GOOD_SEC, pitchJudgement, type BeatRange } from '../logic/judging';
import type { StagePlayer } from './types';

const PITCH_TOLERANCE = 0.8;
const HISTORY_BEATS = 4;

type Judge = (p: StagePlayer, n: StageNote, kind: Judgement) => void;
const inLoop = (loop: BeatRange | null, t: number) => !loop || (t >= loop.from && t < loop.to);

/** Pitch view: credit the time sung on pitch, judge notes once they are over, keep the pitch trail. */
export function advanceSinging(
  p: StagePlayer,
  beat: number,
  beatsPassed: number,
  loop: BeatRange | null,
  judge: Judge,
) {
  const { pitch, singing } = p.voice;
  for (
    let k = lowerBound(p.notes, beat - p.maxDur);
    k < p.notes.length && p.notes[k].t <= beat;
    k++
  ) {
    const n = p.notes[k];
    if (!n.judged && beat < n.t + n.dur && singing && Math.abs(pitch - n.pitch) <= PITCH_TOLERANCE)
      n.acc += beatsPassed;
  }
  while (p.missIdx < p.notes.length && beat >= p.notes[p.missIdx].t + p.notes[p.missIdx].dur) {
    const n = p.notes[p.missIdx++];
    if (!n.judged && inLoop(loop, n.t)) judge(p, n, pitchJudgement(n.acc / n.dur));
  }
  p.history.push({ beat, pitch: singing ? pitch : null });
  while (p.history.length && p.history[0].beat < beat - HISTORY_BEATS) p.history.shift();
}

/** Learn mode, pitch view: the song may go on once the player sings the awaited note. */
export function startAwaitedNote(p: StagePlayer) {
  const n = p.pending[0];
  if (n && p.voice.singing && Math.abs(p.voice.pitch - n.pitch) <= PITCH_TOLERANCE)
    n.started = true;
}

/** Practice and perform: notes that passed the timing window unplayed are misses. */
export function advanceMisses(
  p: StagePlayer,
  beat: number,
  secPerBeat: (t: number) => number,
  loop: BeatRange | null,
  judge: Judge,
) {
  while (
    p.missIdx < p.notes.length &&
    (beat - p.notes[p.missIdx].t) * secPerBeat(p.notes[p.missIdx].t) > GOOD_SEC
  ) {
    const n = p.notes[p.missIdx++];
    if (!n.judged && inLoop(loop, n.t)) judge(p, n, 'miss');
  }
}

/** Clears judgements in a beat range so a loop can be played again. */
export function resetRange(p: StagePlayer, from: number, to: number, restartBeat: number) {
  for (const n of p.notes) {
    if (n.t >= from && n.t < to) {
      n.judged = null;
      n.acc = 0;
      n.started = false;
    }
  }
  p.missIdx = lowerBound(p.notes, restartBeat);
  p.history = [];
}
