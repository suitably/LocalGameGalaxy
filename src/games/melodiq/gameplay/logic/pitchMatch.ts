/**
 * Sung pitch against the expected note [ID: GAME-MELODIQ-PITCH-MATCH]
 *
 * Pure part of `useScoringEngine`: which note was due when the pitch was sung, whether the
 * pitch hits it (pitch class, octave-free) and what that is worth for one scoring tick.
 */
import type { Note } from '../../logic/songVocals';
import { activeNoteIndex, pointsPerBeat } from './noteScoring';

/** Semitones off the note (pitch class) that still count as a hit. */
const HIT_TOLERANCE = 1.2;

export type HitRating = 'Perfect' | 'Good' | 'Okay';

export type PitchMatch =
  /** No note is due at that beat. */
  | { kind: 'none' }
  | { kind: 'miss'; noteIndex: number }
  | { kind: 'hit'; noteIndex: number; rating: HitRating; points: number };

/**
 * Beat at which a pitch was sung: song time minus the singer's latency and the pitch's age (a
 * phone's frame arrives after it was sung, `logic/pitchFrames.ts`), on the song's beat grid.
 */
export function sungBeat(a: {
  songTimeMs: number;
  latencyMs: number;
  ageMs?: number;
  gapMs: number;
  beatDurationMs: number;
}): number {
  return (a.songTimeMs - a.latencyMs - (a.ageMs ?? 0) - a.gapMs) / a.beatDurationMs;
}

/** Distance in semitones between two pitch classes (0–6). */
export function semitoneDistance(sung: number, target: number): number {
  const diff = Math.abs((sung % 12) - (target % 12));
  return Math.min(diff, 12 - diff);
}

export const ratingFor = (semitones: number): HitRating =>
  semitones < 0.3 ? 'Perfect' : semitones < 0.7 ? 'Good' : 'Okay';

/** One scoring tick of `deltaTimeMs` for a sung MIDI note at `beat`. */
export function matchPitch(a: {
  notes: Note[];
  beat: number;
  sungNote: number;
  deltaTimeMs: number;
  beatDurationMs: number;
  goldenNoteMultiplier: number;
  scoreWeight: number;
}): PitchMatch {
  const noteIndex = activeNoteIndex(a.notes, a.beat);
  if (noteIndex === -1) return { kind: 'none' };
  const note = a.notes[noteIndex];
  const semitones = semitoneDistance(a.sungNote, note.pitch);
  if (semitones >= HIT_TOLERANCE) return { kind: 'miss', noteIndex };
  let points =
    (a.deltaTimeMs / a.beatDurationMs) *
    pointsPerBeat(a.notes, a.goldenNoteMultiplier) *
    a.scoreWeight;
  if (note.type === '*') points *= a.goldenNoteMultiplier;
  return { kind: 'hit', noteIndex, rating: ratingFor(semitones), points };
}
