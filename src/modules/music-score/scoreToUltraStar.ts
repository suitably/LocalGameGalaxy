/**
 * `ScoreSong` vocal part → UltraStar `.txt`, the inverse of `ultraStarToScore` (#567, epic #565).
 *
 * UltraStar times are seconds in the recording, so the export needs bar marks (the score aligned to
 * the song's mix). Every note goes score beat → seconds (bar marks) → UltraStar beat on a grid of
 * `15 / #BPM` seconds. Lossy: MusicXML has no golden/freestyle/rap kinds, so notes without
 * `ScoreNote.ultrastar` become normal notes (`:`).
 */
import { ULTRASTAR_PITCH_OFFSET } from './ultrastarScore';
import { createAudioMap, type AudioMap } from './timing';
import type { BarMark, ScoreNote, ScorePart, ScoreSong, UltraStarKind } from './types';

const KIND_CHAR: Record<UltraStarKind, string> = {
  golden: '*',
  freestyle: 'F',
  rap: 'R',
  goldenRap: 'G',
};

/** Finest grid by default: an UltraStar beat of at most 62.5 ms (`#BPM` of at least 240). */
const MIN_DEFAULT_BPM = 240;
/** Ending punctuation that closes a lyric line already at a short pause. */
const SENTENCE_END = /[.!?]-?$/;
const SENTENCE_GAP_FACTOR = 0.4;
const DEFAULT_LINE_GAP_SEC = 0.7;

export interface UltraStarExportOptions {
  /** `#BPM` of the grid (one UltraStar beat lasts 15 / bpm seconds); default: see `defaultUltraStarBpm`. */
  bpm?: number;
  /** `#MP3` file name, normally the song's mix. */
  mp3?: string;
  /** Heuristic line break: pause (seconds) between two notes that starts a new line; default 0.7. */
  lineBreakGapSec?: number;
}

/** Vocal parts with notes, in score order: what the export picker offers. */
export const exportableVocalParts = (song: ScoreSong): ScorePart[] =>
  song.parts.filter((p) => p.guess === 'vocals' && !p.isDrum && p.notes.length > 0);

/** Default `#BPM`: the average quarter tempo of the marks, doubled until the grid is fine enough. */
export function defaultUltraStarBpm(marks: BarMark[]): number {
  const first = marks[0];
  const last = marks[marks.length - 1];
  const span = last.sec - first.sec;
  let bpm = span > 0 ? ((last.beat - first.beat) * 60) / span : MIN_DEFAULT_BPM;
  if (!Number.isFinite(bpm) || bpm <= 0) bpm = MIN_DEFAULT_BPM;
  while (bpm < MIN_DEFAULT_BPM) bpm *= 2;
  return Math.round(bpm * 100) / 100;
}

interface Placed {
  note: ScoreNote;
  start: number;
  dur: number;
}

/** Notes on the beat grid, never overlapping: a monophonic track trims the earlier note. */
function quantize(notes: ScoreNote[], map: AudioMap, gapSec: number, step: number): Placed[] {
  const placed: Placed[] = [];
  for (const note of [...notes].sort((a, b) => a.t - b.t)) {
    let start = Math.max(0, Math.round((map.secAt(note.t) - gapSec) / step));
    const end = Math.round((map.secAt(note.t + note.dur) - gapSec) / step);
    const prev = placed[placed.length - 1];
    if (prev && start < prev.start + prev.dur) {
      if (start - prev.start >= 1) prev.dur = start - prev.start;
      else start = prev.start + prev.dur;
    }
    placed.push({ note, start, dur: Math.max(1, end - start) });
  }
  return placed;
}

/**
 * Line breaks as index in `placed` (the break goes before that note) -> score beat: the stored
 * phrase breaks, else the heuristic (middle of a long pause).
 */
function breakIndexes(part: ScorePart, placed: Placed[], map: AudioMap, minGapSec: number) {
  const out = new Map<number, number>();
  if (part.phraseBreaks?.length) {
    for (const b of part.phraseBreaks) {
      const i = placed.findIndex((p) => p.note.t >= b - 1e-6);
      if (i > 0) out.set(i, b);
    }
    return out;
  }
  for (let i = 1; i < placed.length; i++) {
    const prev = placed[i - 1].note;
    const gap = map.secAt(placed[i].note.t) - map.secAt(prev.t + prev.dur);
    const limit = SENTENCE_END.test(prev.syl ?? '') ? minGapSec * SENTENCE_GAP_FACTOR : minGapSec;
    if (gap >= limit) out.set(i, prev.t + prev.dur + (placed[i].note.t - prev.t - prev.dur) / 2);
  }
  return out;
}

/** UltraStar lyric text: a leading space starts a new word (not the track's first), '~' is a note without lyric. */
function lyric(prev: ScoreNote | undefined, note: ScoreNote, first: boolean): string {
  const word = (note.syl ?? '').replace(/-$/, '').trim();
  if (!word) return '~';
  const continues = !!prev?.syl?.endsWith('-');
  return continues || first ? word : ` ${word}`;
}

function trackLines(part: ScorePart, map: AudioMap, gapSec: number, step: number, minGap: number) {
  const placed = quantize(part.notes, map, gapSec, step);
  const breaks = breakIndexes(part, placed, map, minGap);
  const lines: string[] = [];
  placed.forEach((p, i) => {
    const breakBeat = breaks.get(i);
    if (breakBeat !== undefined) {
      const prev = placed[i - 1];
      const at = Math.round((map.secAt(breakBeat) - gapSec) / step);
      lines.push(`- ${Math.max(prev.start + prev.dur, Math.min(at, p.start))}`);
    }
    const kind = p.note.ultrastar ? KIND_CHAR[p.note.ultrastar] : ':';
    const pitch = Math.round(p.note.pitch) - ULTRASTAR_PITCH_OFFSET;
    const text = lyric(i > 0 ? placed[i - 1].note : undefined, p.note, i === 0);
    lines.push(`${kind} ${p.start} ${p.dur} ${pitch} ${text}`);
  });
  return lines;
}

/**
 * The vocal part (or, as a duet, two parts) as UltraStar `.txt` content.
 * @throws when the score has no bar marks, a part is missing, empty or drums, or more than two
 * parts are asked for.
 */
export function scoreToUltraStar(
  song: ScoreSong,
  partIds: string | string[],
  marks: BarMark[] | null,
  opts: UltraStarExportOptions = {},
): string {
  if (!marks || marks.length < 2) {
    throw new Error(
      'UltraStar export needs bar marks: align the score to the recording first (without them there is no #GAP or timing).',
    );
  }
  const ids = Array.isArray(partIds) ? partIds : [partIds];
  if (ids.length < 1 || ids.length > 2) throw new Error('UltraStar export takes one or two parts.');
  const parts = ids.map((id) => {
    const part = song.parts.find((p) => p.id === id);
    if (!part) throw new Error(`Part "${id}" is not in the score.`);
    if (part.isDrum || part.notes.length === 0) throw new Error(`Part "${id}" has no vocal notes.`);
    return part;
  });

  const map = createAudioMap(song, marks);
  const bpm = opts.bpm && opts.bpm > 0 ? opts.bpm : defaultUltraStarBpm(marks);
  const step = 15 / bpm;
  const firstSec = Math.min(...parts.map((p) => map.secAt(Math.min(...p.notes.map((n) => n.t)))));
  const gapMs = Math.max(0, Math.round(firstSec * 1000));
  const minGap = opts.lineBreakGapSec ?? DEFAULT_LINE_GAP_SEC;

  const out = [
    `#TITLE:${song.title}`,
    `#ARTIST:${song.artist}`,
    `#MP3:${opts.mp3 ?? `${song.title || 'song'}.mp3`}`,
    `#BPM:${bpm}`,
    `#GAP:${gapMs}`,
  ];
  if (parts.length === 2)
    out.push(`#DUETSINGERP1:${parts[0].name}`, `#DUETSINGERP2:${parts[1].name}`);
  parts.forEach((part, i) => {
    if (parts.length === 2) out.push(`P${i + 1}`);
    out.push(...trackLines(part, map, gapMs / 1000, step, minGap));
  });
  out.push('E', '');
  return out.join('\n');
}
