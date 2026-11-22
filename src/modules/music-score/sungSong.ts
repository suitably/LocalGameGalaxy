/**
 * `ScoreSong` vocal parts → what karaoke gameplay sings (#604, epic #565): one track per singer
 * with its notes and `-` line breaks on an UltraStar beat grid (`#BPM` / `#GAP`), the shape
 * Melodiq's scoring, lyrics and pitch lane read.
 *
 * - A score from an UltraStar `.txt` (`ultraStarToScore`: phrase breaks, one tempo, marks straight
 *   from `#BPM` / `#GAP`) maps back exactly: same beats, pitches, kinds and line breaks.
 * - Any other score (MusicXML, MIDI, …) is placed on a grid through its bar marks like the
 *   UltraStar export (#567, `scoreToUltraStarGrid`); without marks its own tempo map times it.
 */
import { beatToSec } from './timing';
import { exportableVocalParts, KIND_CHAR, scoreToUltraStarGrid } from './scoreToUltraStar';
import { ULTRASTAR_PITCH_OFFSET } from './ultrastarScore';
import type { BarMark, ScoreNote, ScorePart, ScoreSong } from './types';
import type { UltraStarNote, UltraStarTrack } from './ultrastar';

/** The sung view of a song: singer tracks on the UltraStar grid (one beat = 15 / `bpm` s). */
export interface SungSong {
  tracks: UltraStarTrack[];
  bpm: number;
  /** Milliseconds from the start of the recording to beat 0. */
  gap: number;
}

const MARK_TOLERANCE_SEC = 1e-6;
const US_UNITS_PER_QUARTER = 4;

/**
 * Parts to sing: `partIds` when given; else every vocal part of a karaoke score (they all carry
 * phrase breaks); else both parts of a two-part vocal score (a duet), or the first vocal part.
 */
export function sungParts(song: ScoreSong, partIds?: string[]): ScorePart[] {
  const vocal = exportableVocalParts(song);
  if (partIds) return vocal.filter((p) => partIds.includes(p.id));
  if (vocal.length > 0 && vocal.every((p) => p.phraseBreaks)) return vocal;
  return vocal.length === 2 ? vocal : vocal.slice(0, 1);
}

/** `#GAP` (seconds) when the marks follow the score's single tempo exactly (an UltraStar grid). */
function ultraStarGap(song: ScoreSong, marks: BarMark[] | null): number | null {
  if (song.tempoMap.length !== 1 || !marks || marks.length < 2) return null;
  const secPerBeat = 60 / song.tempoMap[0].bpm;
  const gap = marks[0].sec - marks[0].beat * secPerBeat;
  const linear = marks.every(
    (m) => Math.abs(m.sec - gap - m.beat * secPerBeat) < MARK_TOLERANCE_SEC,
  );
  return linear ? gap : null;
}

const breakNote = (beat: number): UltraStarNote => ({
  type: '-',
  start: beat * US_UNITS_PER_QUARTER,
  duration: 0,
  pitch: 0,
  text: '',
});

/** Lyric text: a leading space starts a new word, except at the start of a line. */
function sungText(prev: ScoreNote | undefined, note: ScoreNote, lineStart: boolean): string {
  const word = (note.syl ?? '').replace(/-$/, '').trim();
  const newWord = !!prev && !prev.syl?.endsWith('-');
  return newWord && !lineStart && word ? ` ${word}` : word;
}

/** A karaoke part back on its own grid: every note and phrase break where the `.txt` had it. */
function exactTrack(part: ScorePart): UltraStarTrack {
  const breaks = [...(part.phraseBreaks ?? [])];
  const notes: UltraStarNote[] = [];
  let lineStart = true;
  part.notes.forEach((n, i) => {
    while (breaks.length > 0 && breaks[0] <= n.t) {
      notes.push(breakNote(breaks.shift() as number));
      lineStart = true;
    }
    notes.push({
      type: n.ultrastar ? KIND_CHAR[n.ultrastar] : ':',
      start: n.t * US_UNITS_PER_QUARTER,
      duration: n.dur * US_UNITS_PER_QUARTER,
      pitch: n.pitch - ULTRASTAR_PITCH_OFFSET,
      text: sungText(part.notes[i - 1], n, lineStart),
    });
    lineStart = false;
  });
  notes.push(...breaks.map(breakNote));
  return { name: part.name, notes };
}

/** Bar marks from the score's own tempo map, for a score nobody aligned to a recording. */
const tempoMarks = (song: ScoreSong): BarMark[] =>
  [...song.measureStarts, song.end].map((beat) => ({ beat, sec: beatToSec(song.tempoMap, beat) }));

/**
 * The sung view of a score's vocal parts (see the file comment).
 * @throws when the score has no vocal part with notes.
 */
export function scoreToSungSong(
  song: ScoreSong,
  marks: BarMark[] | null,
  partIds?: string[],
): SungSong {
  const parts = sungParts(song, partIds);
  if (parts.length === 0) throw new Error('The score has no vocal part with notes.');
  const gapSec = ultraStarGap(song, marks);
  if (gapSec !== null && parts.every((p) => p.phraseBreaks)) {
    return {
      tracks: parts.map(exactTrack),
      bpm: song.tempoMap[0].bpm,
      // whole microseconds: `#GAP` / 1000 * 1000 is not always exact in floating point
      gap: Math.round(gapSec * 1e6) / 1e3,
    };
  }
  const grid = scoreToUltraStarGrid(
    song,
    parts,
    marks && marks.length >= 2 ? marks : tempoMarks(song),
  );
  return { tracks: grid.tracks, bpm: grid.bpm, gap: grid.gapMs };
}
