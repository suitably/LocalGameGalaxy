import type {
  InstrumentKind,
  ScoreNote,
  ScorePart,
  ScoreSong,
  StrumDirection,
} from '../../../../modules/music-score';
import type { StrumMode, StrumSetting } from '../../../../lib/companion/songScoresApi';

/**
 * Strum direction of the strokes of a guitar part (#634). Precedence per stroke: the user's
 * per-bar override, then the user's song-wide direction, then a mark in the score (MusicXML
 * bowing, Guitar Pro pick stroke), then the rhythm: downstrokes on the beats, upstrokes on the
 * eighth offbeats; in a beat with sixteenths, downstrokes on the eighths and upstrokes on the
 * sixteenths between. Off that grid (triplets) the hand keeps alternating from the last stroke.
 */
export type { StrumMode, StrumSetting };

const EPS = 1e-3;

/** Instruments whose chords are strummed (bass lines are picked one note at a time). */
export const isStrummed = (kind: InstrumentKind) => kind === 'guitar' || kind === 'ukulele';

/** Index of the played bar holding `beat` (last bar start at or before it). */
export function barIndexAt(song: Pick<ScoreSong, 'measureStarts'>, beat: number): number {
  const ms = song.measureStarts;
  let lo = 0;
  let hi = ms.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ms[mid] <= beat + EPS) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(0, lo);
}

interface Stroke {
  t: number;
  notes: ScoreNote[];
}

/** Notes starting together; a stroke is a chord (two or more) or a note the score marks. */
function strokesOf(notes: ScoreNote[]): Stroke[] {
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  const groups: Stroke[] = [];
  for (const n of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.t - n.t) < EPS) last.notes.push(n);
    else groups.push({ t: n.t, notes: [n] });
  }
  return groups.filter((g) => g.notes.length > 1 || g.notes.some((n) => n.strum));
}

const near = (x: number) => Math.abs(x - Math.round(x)) < EPS * 4;

/** Directions from the rhythm alone, in stroke order. */
export function derivedStrums(times: number[], measureStarts: number[]): StrumDirection[] {
  const song = { measureStarts };
  const place = times.map((t) => {
    const bar = barIndexAt(song, t);
    const pos = t - (measureStarts[bar] ?? 0);
    const beat = Math.floor(pos + EPS);
    return { key: `${bar}:${beat}`, sub: (pos - beat) * 4 };
  });
  const sixteenths = new Set(
    place.filter((p) => near(p.sub) && Math.round(p.sub) % 2 === 1).map((p) => p.key),
  );
  const out: StrumDirection[] = [];
  place.forEach((p, i) => {
    const prev = out[i - 1];
    if (!near(p.sub)) {
      out.push(prev === 'down' ? 'up' : 'down');
      return;
    }
    const k = Math.round(p.sub);
    // a beat with a stroke on an odd sixteenth swings in sixteenths, every other beat in eighths
    const up = sixteenths.has(p.key) ? k % 2 === 1 : k === 2;
    out.push(up ? 'up' : 'down');
  });
  return out;
}

/** The user's choice for one bar: its own override, else the song-wide direction, else none. */
function userChoice(setting: StrumSetting | undefined, bar: number): StrumDirection | null {
  const own: StrumMode | undefined = setting?.bars?.[String(bar + 1)];
  if (own === 'down' || own === 'up') return own;
  if (own === 'auto') return null;
  return setting?.mode ?? null;
}

/**
 * The part's notes with `strum` set on every note of a stroke (chords and marked notes), following
 * the precedence above. Single unmarked notes keep no direction (picked lines show no arrows).
 */
export function resolveStrums(
  part: ScorePart,
  song: Pick<ScoreSong, 'measureStarts'>,
  setting: StrumSetting | undefined,
): ScoreNote[] {
  const strokes = strokesOf(part.notes);
  if (!strokes.length) return part.notes;
  const derived = derivedStrums(
    strokes.map((s) => s.t),
    song.measureStarts,
  );
  const dir = new Map<ScoreNote, StrumDirection>();
  strokes.forEach((s, i) => {
    const marked = s.notes.find((n) => n.strum)?.strum;
    const d = userChoice(setting, barIndexAt(song, s.t)) ?? marked ?? derived[i];
    for (const n of s.notes) dir.set(n, d);
  });
  return part.notes.map((n) => {
    const d = dir.get(n);
    return d && d !== n.strum ? { ...n, strum: d } : n;
  });
}

/** The song with strum directions on its guitar and ukulele parts. */
export function withStrums(
  song: ScoreSong,
  settings: Record<string, { strum?: StrumSetting }>,
): ScoreSong {
  let changed = false;
  const parts = song.parts.map((p) => {
    if (!isStrummed(p.guess)) return p;
    const notes = resolveStrums(p, song, settings[p.id]?.strum);
    if (notes === p.notes || notes.every((n, i) => n === p.notes[i])) return p;
    changed = true;
    return { ...p, notes };
  });
  return changed ? { ...song, parts } : song;
}

/**
 * Applies a change to a part's strum setting and keeps only what differs from the default:
 * `mode: 'auto'` and bar overrides equal to what the bar would get anyway are dropped.
 */
export function updateStrumSetting(
  current: StrumSetting | undefined,
  change: { mode?: StrumMode; bar?: number; barMode?: StrumMode },
): StrumSetting | undefined {
  const modeIn = change.mode ?? current?.mode ?? 'auto';
  const mode = modeIn === 'auto' ? undefined : modeIn;
  const bars: Record<string, StrumMode> = { ...current?.bars };
  if (change.bar !== undefined && change.bar >= 1) {
    const key = String(Math.floor(change.bar));
    if (!change.barMode || change.barMode === (mode ?? 'auto')) delete bars[key];
    else bars[key] = change.barMode;
  }
  // after a song-wide change, overrides that now match it are noise
  for (const [k, v] of Object.entries(bars)) if (v === (mode ?? 'auto')) delete bars[k];
  const out: StrumSetting = {};
  if (mode) out.mode = mode;
  if (Object.keys(bars).length) out.bars = bars;
  return Object.keys(out).length ? out : undefined;
}
