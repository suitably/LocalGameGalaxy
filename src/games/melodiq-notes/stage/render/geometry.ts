import type { StagePlayer } from '../engine/types';
import { STRING_TUNINGS } from '../../../../modules/music-score';
import { clamp } from './common';

export const isBlackKey = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

export interface KeyGeometry {
  lo: number;
  hi: number;
  whites: number[];
  whiteWidth: number;
  keys: Record<number, { x: number; w: number; black: boolean }>;
  hitY: number;
  keyHeight: number;
}

/** Keyboard covering the part's range plus the octave the computer keyboard plays. */
export function keyGeometry(p: StagePlayer, w: number, h: number, isFocus: boolean): KeyGeometry {
  let lo = Math.min(p.range.lo, isFocus ? p.octaveBase : p.range.lo) - 1;
  let hi = Math.max(p.range.hi, isFocus ? p.octaveBase + 12 : p.range.hi) + 1;
  if (hi - lo < 24) {
    const c = (lo + hi) >> 1;
    lo = c - 12;
    hi = c + 12;
  }
  if (hi - lo > 61) {
    lo = Math.max(lo, p.range.median - 30);
    hi = lo + 61;
  }
  while (isBlackKey(lo)) lo--;
  while (isBlackKey(hi)) hi++;
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) whites.push(m);
  const whiteWidth = w / whites.length;
  const blackWidth = whiteWidth * 0.6;
  const keys: KeyGeometry['keys'] = {};
  whites.forEach((m, i) => (keys[m] = { x: i * whiteWidth, w: whiteWidth, black: false }));
  for (let m = lo; m <= hi; m++) {
    if (isBlackKey(m))
      keys[m] = { x: keys[m - 1].x + whiteWidth - blackWidth / 2, w: blackWidth, black: true };
  }
  const keyHeight = clamp(h * 0.22, 44, 120);
  return { lo, hi, whites, whiteWidth, keys, hitY: h - keyHeight, keyHeight };
}

export function keyAt(geo: KeyGeometry, x: number, y: number): number | null {
  if (y < geo.hitY) return null;
  if (y < geo.hitY + geo.keyHeight * 0.62) {
    for (let m = geo.lo; m <= geo.hi; m++) {
      const k = geo.keys[m];
      if (k.black && x >= k.x && x <= k.x + k.w) return m;
    }
  }
  return geo.whites[clamp(Math.floor(x / geo.whiteWidth), 0, geo.whites.length - 1)];
}

export interface StringGeometry {
  top: number;
  bottom: number;
  gap: number;
  hitX: number;
  pxPerBeat: number;
  lookBeats: number;
  fretboardH: number;
  strings: string[];
  tuning: number[];
}

export function stringGeometry(p: StagePlayer, w: number, h: number): StringGeometry {
  const t = STRING_TUNINGS[p.instrument.kind] ?? STRING_TUNINGS.guitar!;
  const fretboardH = h > 300 ? clamp(h * 0.24, 70, 110) : 0;
  const top = 34;
  const bottom = h - fretboardH - (fretboardH ? 22 : 16);
  const hitX = clamp(w * 0.13, 52, 130);
  const lookBeats = clamp((w - hitX) / 110, 3, 7);
  return {
    top,
    bottom,
    gap: (bottom - top) / (t.strings.length - 1),
    hitX,
    pxPerBeat: (w - hitX - 8) / lookBeats,
    lookBeats,
    fretboardH,
    strings: t.strings,
    tuning: t.tuning,
  };
}

export const stringAt = (geo: StringGeometry, y: number) =>
  clamp(Math.round((y - geo.top) / geo.gap), 0, geo.strings.length - 1);

export function drumGeometry(w: number, h: number) {
  const hitY = h * 0.76;
  const width = Math.min(w * 0.92, 700);
  return { hitY, horizonY: 22, cx: w / 2, width, kickY: hitY + Math.min(40, h * 0.12) };
}

export function drumLaneAt(w: number, h: number, x: number, y: number): number {
  const g = drumGeometry(w, h);
  if (y > g.hitY + 28) return 4;
  return clamp(Math.floor((x - (w - g.width) / 2) / (g.width / 4)), 0, 3);
}

export function pitchGeometry(p: StagePlayer, w: number, h: number) {
  const lo = Math.min(p.range.lo - 2, p.range.median - 7);
  const hi = Math.max(p.range.hi + 2, p.range.median + 7);
  const top = 26;
  const bottom = h - (p.instrument.kind === 'vocals' ? 46 : 18);
  const laneH = (bottom - top) / (hi - lo);
  const hitX = clamp(w * 0.22, 60, 240);
  const lookBeats = clamp((w - hitX) / 110, 3, 8);
  return {
    lo,
    hi,
    top,
    bottom,
    laneH,
    hitX,
    lookBeats,
    pxPerBeat: (w - hitX) / lookBeats,
    yOf: (pitch: number) => bottom - (pitch - lo + 0.5) * laneH,
    pitchAt: (y: number) => clamp(lo - 0.5 + (bottom - y) / laneH, lo, hi),
  };
}
