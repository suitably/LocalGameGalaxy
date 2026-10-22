import type { ScoreSong } from '../../../../modules/music-score';
import { lowerBound, type StageNote } from '../logic/charts';
import type { StagePlayer } from '../engine/types';

export type Ctx = CanvasRenderingContext2D;

/** Localised words the canvas needs; built from i18n by the component. */
export interface StageTexts {
  player: (no: number) => string;
  keyboardFocus: string;
  instrument: (kind: string) => string;
  drum: (id: string) => string;
  nextGrip: string;
  fromFret: (fret: number) => string;
  judgement: Record<'perfect' | 'good' | 'miss' | 'learn' | 'wrong', string>;
  combo: string;
  noPlayers: string;
}

export const HEADER_H = 28;
export const MISS_COLOR = '#4a4566';
export const FONT_BODY = 'Figtree, system-ui, sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
export const FONT_DISPLAY = 'Syne, system-ui, sans-serif';

export function roundRect(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Calls `fn` for every bar line between two beats. */
export function forBarLines(
  song: ScoreSong,
  from: number,
  to: number,
  fn: (beat: number, index: number) => void,
) {
  const ms = song.measureStarts;
  let lo = 0;
  let hi = ms.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ms[mid] < from) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < ms.length && ms[i] <= to; i++) fn(ms[i], i);
}

/** Calls `fn` for every note that may be visible between two beats (long notes reach back). */
export function forVisibleNotes(
  p: StagePlayer,
  from: number,
  to: number,
  fn: (n: StageNote) => void,
) {
  for (let i = lowerBound(p.notes, from - p.maxDur); i < p.notes.length && p.notes[i].t <= to; i++)
    fn(p.notes[i]);
}

export function drawPanelBackground(g: Ctx, color: string, w: number, h: number, pulse: number) {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#120f24');
  grd.addColorStop(1, '#0a0914');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const rg = g.createRadialGradient(w / 2, h, 10, w / 2, h, Math.max(w, h) * 0.9);
  rg.addColorStop(0, withAlpha(color, 0.08 + pulse * 0.08));
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
}

export function barLabel(g: Ctx, text: string, x: number, y: number) {
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.font = `600 10px ${FONT_BODY}`;
  g.fillText(text, x, y);
}
