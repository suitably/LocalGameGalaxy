import {
  assignTab,
  drumLaneOf,
  drumVoiceOfKey,
  STRING_TUNINGS,
  topLine,
  type DrumVoice,
  type Hand,
  type InstrumentKind,
  type ScorePart,
} from '../../../../modules/music-score';
import { STAGE_INSTRUMENTS } from './instruments';

export type Judgement = 'perfect' | 'good' | 'miss' | 'learn';

/** A note as the stage plays and scores it. `lane` is the pitch, string, or drum lane depending on the view. */
export interface StageNote {
  id: number;
  t: number;
  dur: number;
  pitch: number;
  lane: number;
  fret?: number;
  syl?: string;
  /** Drums: the written instrument and articulation. */
  drum?: DrumVoice;
  /** Drums: sticking, when the score has it. */
  hand?: Hand;
  /** Written accent: play this stroke louder. */
  accent?: boolean;
  /** Drums: a grace stroke on the same drum just before (flam). */
  flam?: boolean;
  judged: Judgement | null;
  /** Beats sung on pitch (pitch view). */
  acc: number;
  /** Learn mode, pitch view: the player found the note, so the song may move on. */
  started: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const pitchClassName = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];
export const noteName = (midi: number) => `${pitchClassName(midi)}${Math.floor(midi / 12) - 1}`;

/** Turns a score part into the notes one instrument plays: tab positions, drum lanes or a single sung line. */
export function buildChart(part: ScorePart, kind: InstrumentKind): StageNote[] {
  const view = STAGE_INSTRUMENTS[kind].view;
  let notes: Omit<StageNote, 'id' | 'judged' | 'acc' | 'started'>[];
  if (view === 'strings') {
    notes = assignTab(part.notes, STRING_TUNINGS[kind] ?? STRING_TUNINGS.guitar!);
  } else if (view === 'drums') {
    const seen = new Set<string>();
    notes = part.notes
      .map((n) => ({
        ...n,
        lane: part.isDrum ? drumLaneOf(n.pitch) : [4, 2, 1, 3, 0][n.pitch % 5],
        drum: part.isDrum ? (n.drum ?? drumVoiceOfKey(n.pitch)) : undefined,
      }))
      .filter((n) => {
        const key = `${Math.round(n.t * 1000)}:${n.lane}:${n.drum ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } else if (view === 'pitch') {
    notes = topLine(part.notes).map((n) => ({ ...n, lane: n.pitch }));
  } else {
    notes = part.notes.map((n) => ({ ...n, lane: n.pitch }));
  }
  return notes
    .sort((a, b) => a.t - b.t || a.lane - b.lane)
    .map((n, id) => ({ ...n, id, judged: null, acc: 0, started: false }));
}

export interface PitchRange {
  lo: number;
  hi: number;
  median: number;
}

export function pitchRange(notes: StageNote[]): PitchRange {
  const ps = notes.map((n) => n.pitch).sort((a, b) => a - b);
  if (!ps.length) return { lo: 55, hi: 72, median: 60 };
  return { lo: ps[0], hi: ps[ps.length - 1], median: ps[ps.length >> 1] };
}

/** First note index with t >= beat (notes sorted by t). */
export function lowerBound(notes: { t: number }[], beat: number): number {
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].t < beat) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
