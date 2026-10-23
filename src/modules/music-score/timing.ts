import type { BarMark, ScoreSong, TempoEvent } from './types';

export function bpmAt(tempoMap: TempoEvent[], beat: number): number {
  let bpm = tempoMap[0]?.bpm ?? 120;
  for (const e of tempoMap) {
    if (e.beat <= beat + 1e-9) bpm = e.bpm;
    else break;
  }
  return bpm;
}

/** Seconds from bar 1 to `beat` following the tempo map (negative beats use the first tempo). */
export function beatToSec(tempoMap: TempoEvent[], beat: number): number {
  const first = tempoMap[0]?.bpm ?? 120;
  if (beat <= 0) return (beat * 60) / first;
  let sec = 0;
  for (let i = 0; i < tempoMap.length; i++) {
    const from = tempoMap[i].beat;
    const to = i + 1 < tempoMap.length ? tempoMap[i + 1].beat : Infinity;
    if (beat <= from) break;
    sec += ((Math.min(beat, to) - from) * 60) / tempoMap[i].bpm;
  }
  return sec;
}

export function secToBeat(tempoMap: TempoEvent[], sec: number): number {
  const first = tempoMap[0]?.bpm ?? 120;
  if (sec <= 0) return (sec * first) / 60;
  let acc = 0;
  for (let i = 0; i < tempoMap.length; i++) {
    const from = tempoMap[i].beat;
    const to = i + 1 < tempoMap.length ? tempoMap[i + 1].beat : Infinity;
    const seg = ((to - from) * 60) / tempoMap[i].bpm;
    if (sec <= acc + seg) return from + ((sec - acc) * tempoMap[i].bpm) / 60;
    acc += seg;
  }
  return 0;
}

export function songSeconds(song: ScoreSong): number {
  return beatToSec(song.tempoMap, song.end);
}

/** Index of the played bar that contains `beat` (clamped to the song). */
export function measureIndexAt(song: ScoreSong, beat: number): number {
  const ms = song.measureStarts;
  let lo = 0;
  let hi = ms.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ms[mid] <= beat) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(0, lo);
}

export interface AudioMap {
  /** Position in the recording (seconds) of a score beat. */
  secAt(beat: number): number;
  /** Score beat at a position in the recording. */
  beatAt(sec: number): number;
}

function interpolate(marks: BarMark[], key: 'beat' | 'sec', value: number, out: 'beat' | 'sec') {
  let lo = 0;
  let hi = marks.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (marks[mid][key] <= value) lo = mid;
    else hi = mid;
  }
  const a = marks[lo];
  const b = marks[hi];
  return a[out] + ((value - a[key]) / (b[key] - a[key])) * (b[out] - a[out]);
}

/**
 * Maps score beats to a recording. With bar marks the map follows the
 * recording bar by bar; without them it is the score tempo plus a start offset.
 */
export function createAudioMap(song: ScoreSong, marks: BarMark[] | null, offsetSec = 0): AudioMap {
  const tm = song.tempoMap;
  if (!marks || marks.length < 2) {
    return {
      secAt: (beat) => beatToSec(tm, beat) + offsetSec,
      beatAt: (sec) => secToBeat(tm, sec - offsetSec),
    };
  }
  const first = marks[0];
  const last = marks[marks.length - 1];
  return {
    secAt(beat) {
      if (beat <= first.beat)
        return first.sec + ((beat - first.beat) * 60) / bpmAt(tm, 0) + offsetSec;
      if (beat >= last.beat)
        return last.sec + ((beat - last.beat) * 60) / bpmAt(tm, last.beat) + offsetSec;
      return interpolate(marks, 'beat', beat, 'sec') + offsetSec;
    },
    beatAt(sec) {
      const s = sec - offsetSec;
      if (s <= first.sec) return first.beat + ((s - first.sec) * bpmAt(tm, 0)) / 60;
      if (s >= last.sec) return last.beat + ((s - last.sec) * bpmAt(tm, last.beat)) / 60;
      return interpolate(marks, 'sec', s, 'beat');
    },
  };
}
