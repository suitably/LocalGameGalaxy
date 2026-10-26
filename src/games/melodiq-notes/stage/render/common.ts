import type { ScoreSong } from '../../../../modules/music-score';
import { lowerBound, type StageNote } from '../logic/charts';
import type { StagePlayer } from '../engine/types';
import { darkTokens as t, fontFamilies } from '../../../../themeTokens';

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
/** Stage colours, derived from the design tokens. The stage is always dark (DESIGN.md §9). */
export const STAGE = {
  bgTop: t.bg.surface,
  bgBottom: t.bg.canvas,
  panel: t.bg.raised,
  ink: t.text.primary,
  muted: t.text.secondary,
  dim: t.border.strong,
  perfect: t.primary.main,
  good: t.accent.main,
  hit: t.success,
  miss: t.error,
} as const;

export const MISS_COLOR = STAGE.dim;

/** Scrolling views put the play line at a third of the width; what lies left of it was played. */
export const playLineX = (w: number, min = 52) => Math.max(min, w / 3);
/** Opacity of notes that already passed the play line. */
export const PLAYED_ALPHA = 0.35;
/** Draws a note faint once its start has passed the play line. */
export function fadeIfPlayed(g: Ctx, n: StageNote, beat: number) {
  g.globalAlpha = n.t < beat ? PLAYED_ALPHA : 1;
}
export const FONT_BODY = fontFamilies.text;
export const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
export const FONT_DISPLAY = fontFamilies.display;

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

/**
 * Fills the current path with a soft halo around it. A translucent stroke costs
 * one extra draw call; `shadowBlur` blurs every note and made frames drop.
 */
export function fillWithHalo(
  g: CanvasRenderingContext2D,
  color: string,
  halo: number,
  fill = color,
) {
  g.strokeStyle = withAlpha(color, 0.3);
  g.lineWidth = halo;
  g.stroke();
  g.fillStyle = fill;
  g.fill();
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
  grd.addColorStop(0, STAGE.bgTop);
  grd.addColorStop(1, STAGE.bgBottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const rg = g.createRadialGradient(w / 2, h, 10, w / 2, h, Math.max(w, h) * 0.9);
  rg.addColorStop(0, withAlpha(color, 0.08 + pulse * 0.08));
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, w, h);
}

export function barLabel(g: Ctx, text: string, x: number, y: number) {
  g.fillStyle = withAlpha(STAGE.ink, 0.28);
  g.font = `600 10px ${FONT_BODY}`;
  g.fillText(text, x, y);
}
