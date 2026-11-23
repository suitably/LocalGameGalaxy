import {
  DRUM_KICK_LANE,
  DRUM_PERCUSSION_LANE,
  DRUM_TOM_LANES,
  drumLaneOfVoice,
} from '../../../../modules/music-score';
import type { StageNote } from './charts';

/**
 * Which drum lanes one player sees and plays (#571, ADR-0007). The stage shows only the pad lanes
 * the song uses; a pult has one tom pad and tells the toms apart by colour.
 */
export interface DrumKit {
  /** Pad lanes left to right (DRUM_LANES indices, kick excluded; it is the bar below). */
  pads: number[];
  /** Toms 1–3 and the floor tom share one pad and percussion is left out (the pult). */
  mergeToms: boolean;
  /** Notes drawn but never judged nor scored: the percussion lane while it is display-only. */
  shown: StageNote[];
}

export interface DrumKitOptions {
  /** Percussion is judged like a kit piece; off (default) makes it a display-only learn lane. */
  judgePercussion: boolean;
  mergeToms: boolean;
}

/** Pads shown when a part has no pad notes at all: cymbal, hi-hat, snare, tom. */
export const DEFAULT_DRUM_PADS: readonly number[] = [0, 1, 2, 3];
const TOM_PAD = DRUM_TOM_LANES[0];

/** The lane a hit on `lane` lands on for this kit (any tom is the tom pad on a pult). */
export const padLane = (kit: Pick<DrumKit, 'mergeToms'> | undefined, lane: number) =>
  kit?.mergeToms && DRUM_TOM_LANES.includes(lane) ? TOM_PAD : lane;

/** The lane whose colour and name a note shows: its own voice's, also on a merged tom pad. */
export const drumColorLane = (n: Pick<StageNote, 'lane' | 'drum'>) =>
  n.drum ? drumLaneOfVoice(n.drum) : n.lane;

/**
 * Splits a drum chart into the notes the player plays and the display-only ones, and picks the
 * pads to draw. Note ids stay as built, so a pult's judgements still match the stage's notes.
 */
export function drumKitOf(
  chart: StageNote[],
  opts: DrumKitOptions,
): DrumKit & { notes: StageNote[] } {
  const notes: StageNote[] = [];
  const shown: StageNote[] = [];
  for (const n of chart) {
    const lane = padLane(opts, n.lane);
    const note = lane === n.lane ? n : { ...n, lane };
    // the pult has no room for a percussion lane; the stage shows it and its band plays it
    if (n.lane === DRUM_PERCUSSION_LANE && opts.mergeToms) continue;
    if (n.lane === DRUM_PERCUSSION_LANE && !opts.judgePercussion) shown.push(note);
    else notes.push(note);
  }
  const used = new Set([...notes, ...shown].map((n) => n.lane));
  used.delete(DRUM_KICK_LANE);
  const pads = [...used].sort((a, b) => a - b);
  return {
    notes,
    shown,
    mergeToms: opts.mergeToms,
    pads: pads.length ? pads : [...DEFAULT_DRUM_PADS],
  };
}

/** Computer keys for the fixed pads; the tom keys play the shown toms from left to right. */
const FIXED_KEYS: Record<number, { key: string; code: string }> = {
  0: { key: 'D', code: 'KeyD' },
  1: { key: 'F', code: 'KeyF' },
  2: { key: 'J', code: 'KeyJ' },
  [DRUM_PERCUSSION_LANE]: { key: 'G', code: 'KeyG' },
  [DRUM_KICK_LANE]: { key: '␣', code: 'Space' },
};
const TOM_KEYS = [
  { key: 'K', code: 'KeyK' },
  { key: 'L', code: 'KeyL' },
  { key: ';', code: 'Semicolon' },
  { key: "'", code: 'Quote' },
];

/** The computer key that plays `lane` with these pads, or null. */
export function drumKeyOf(lane: number, pads: readonly number[]) {
  if (!DRUM_TOM_LANES.includes(lane)) return FIXED_KEYS[lane] ?? null;
  const i = pads.filter((l) => DRUM_TOM_LANES.includes(l)).indexOf(lane);
  return TOM_KEYS[i] ?? null;
}

/** The lane a physical key (`KeyboardEvent.code`) plays with these pads, or -1. */
export function drumLaneOfKey(code: string, pads: readonly number[]): number {
  for (const lane of [...pads, DRUM_KICK_LANE])
    if (drumKeyOf(lane, pads)?.code === code) return lane;
  return -1;
}
