import type { StageNote } from '../logic/charts';
import {
  clamp,
  FONT_BODY,
  FONT_MONO,
  forBarLines,
  forVisibleNotes,
  withAlpha,
  type Ctx,
} from './common';
import type { HitPoint, ViewContext } from './view';

const DIATONIC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const SHARP = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const pc = (m: number) => ((m % 12) + 12) % 12;
const diatonic = (m: number) => (Math.floor(m / 12) - 1) * 7 + DIATONIC[pc(m)];
/** Staff positions (diatonic steps on a treble staff) of the drum lanes: crash, hi-hat, snare, tom, kick. */
const DRUM_STEP = [41, 39, 35, 37, 31];
const STAFF_INK = 'rgba(238,235,255,0.55)';
/** Guitar and bass are written an octave above sounding pitch. */
const WRITTEN_OCTAVE = { guitar: 12, bass: 12 } as Record<string, number>;

type Points = Map<StageNote, { x: number; y: number }>;

interface Scroll {
  beat: number;
  hitX: number;
  ppb: number;
}

function noteColor(v: ViewContext, n: StageNote) {
  if (n.judged === 'miss') return '#ff5c7a';
  if (n.judged) return '#7be3a5';
  return n.t - v.beat < 0.6 ? v.p.instrument.color : '#eeebff';
}

function drawStaff(v: ViewContext, top: number, height: number, s: Scroll, points: Points) {
  const { g, p, w } = v;
  const sp = clamp(height / 12, 5, 11);
  const staffTop = top + height / 2 - 2 * sp - (p.instrument.kind === 'vocals' ? sp : 0);
  const bottomY = staffTop + 4 * sp;
  const isDrum = p.instrument.view === 'drums';
  const written = WRITTEN_OCTAVE[p.instrument.kind] ?? 0;
  const clef = isDrum ? 'perc' : p.range.median + written >= 55 ? 'treble' : 'bass';
  const baseStep = clef === 'bass' ? 18 : 30;
  const yOf = (step: number) => bottomY - ((step - baseStep) * sp) / 2;
  g.strokeStyle = STAFF_INK;
  g.lineWidth = 1;
  for (let i = 0; i < 5; i++) line(g, 0, staffTop + i * sp, w, staffTop + i * sp);
  g.fillStyle = 'rgba(238,235,255,0.8)';
  if (clef === 'perc') {
    g.fillRect(8, staffTop + sp, 3, sp * 2);
    g.fillRect(14, staffTop + sp, 3, sp * 2);
  } else {
    g.font = `${Math.round(sp * (clef === 'treble' ? 4.3 : 3.4))}px "Noto Music", serif`;
    g.fillText(
      clef === 'treble' ? '𝄞' : '𝄢',
      4,
      clef === 'treble' ? bottomY - sp : staffTop + sp * 2.6,
    );
  }
  forBarLines(v.song, s.beat - s.hitX / s.ppb, s.beat + (w - s.hitX) / s.ppb, (b, i) => {
    const x = s.hitX + (b - s.beat) * s.ppb;
    if (x < 34) return;
    g.strokeStyle = STAFF_INK;
    line(g, x, staffTop, x, bottomY);
    g.fillStyle = 'rgba(238,235,255,0.4)';
    g.font = `600 9px ${FONT_BODY}`;
    g.fillText(String(i + 1), x + 2, staffTop - 4);
  });
  forVisibleNotes(p, s.beat - s.hitX / s.ppb, s.beat + (w - s.hitX) / s.ppb, (n) => {
    const x = s.hitX + (n.t - s.beat) * s.ppb;
    if (x < 30 || x > w + 10) return;
    const step = isDrum ? DRUM_STEP[n.lane] : diatonic(n.pitch + written);
    const y = yOf(step);
    points.set(n, { x, y });
    g.strokeStyle = STAFF_INK;
    g.lineWidth = 1;
    for (let l = baseStep - 2; l >= step; l -= 2) line(g, x - sp, yOf(l), x + sp, yOf(l));
    for (let l = baseStep + 10; l <= step; l += 2) line(g, x - sp, yOf(l), x + sp, yOf(l));
    drawNoteSymbol(g, n, x, y, sp, step < baseStep + 4, noteColor(v, n), isDrum && n.lane <= 1);
    if (!isDrum && SHARP[pc(n.pitch + written)]) {
      g.font = `${Math.round(sp * 1.4)}px "Noto Music", serif`;
      g.fillText('♯', x - sp * 1.9, y + sp * 0.45);
    }
    if (p.instrument.kind === 'vocals' && n.syl) {
      g.fillStyle = n.t <= s.beat && s.beat < n.t + n.dur ? '#ffffff' : 'rgba(238,235,255,0.6)';
      g.font = `600 13px ${FONT_BODY}`;
      g.textAlign = 'center';
      g.fillText(n.syl, x, bottomY + sp * 4.2);
      g.textAlign = 'left';
    }
  });
}

function drawNoteSymbol(
  g: Ctx,
  n: StageNote,
  x: number,
  y: number,
  sp: number,
  stemUp: boolean,
  color: string,
  cross: boolean,
) {
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = 1.4;
  if (cross) {
    g.beginPath();
    g.moveTo(x - sp * 0.5, y - sp * 0.5);
    g.lineTo(x + sp * 0.5, y + sp * 0.5);
    g.moveTo(x + sp * 0.5, y - sp * 0.5);
    g.lineTo(x - sp * 0.5, y + sp * 0.5);
    g.stroke();
  } else {
    g.beginPath();
    g.ellipse(x, y, sp * 0.62, sp * 0.44, -0.35, 0, Math.PI * 2);
    if (n.dur >= 2) g.stroke();
    else g.fill();
  }
  if (n.dur < 4) {
    const sx = stemUp ? x + sp * 0.58 : x - sp * 0.58;
    const end = stemUp ? y - sp * 3.2 : y + sp * 3.2;
    g.lineWidth = 1.2;
    line(g, sx, y, sx, end);
    const flags = n.dur <= 0.26 ? 2 : n.dur <= 0.51 ? 1 : 0;
    for (let f = 0; f < flags; f++) {
      const fy = end + (stemUp ? 1 : -1) * f * sp * 0.8;
      g.beginPath();
      g.moveTo(sx, fy);
      g.quadraticCurveTo(
        sx + sp,
        fy + (stemUp ? sp : -sp),
        sx + sp * 0.7,
        fy + (stemUp ? sp * 1.8 : -sp * 1.8),
      );
      g.stroke();
    }
  }
  if ([0.75, 1.5, 3].some((d) => Math.abs(n.dur - d) < 0.01)) {
    g.beginPath();
    g.arc(x + sp, y - sp * 0.2, 1.6, 0, Math.PI * 2);
    g.fill();
  }
}

function drawTab(v: ViewContext, top: number, height: number, s: Scroll, points: Points) {
  const { g, p, w } = v;
  const strings = p.instrument.kind === 'guitar' ? 6 : 4;
  const sp = clamp(height / (strings + 2.5), 9, 20);
  const t0 = top + (height - sp * (strings - 1)) / 2;
  g.strokeStyle = 'rgba(238,235,255,0.5)';
  g.lineWidth = 1;
  for (let i = 0; i < strings; i++) line(g, 0, t0 + i * sp, w, t0 + i * sp);
  g.fillStyle = 'rgba(238,235,255,0.8)';
  g.font = `800 ${Math.round(sp * 0.9)}px ${FONT_BODY}`;
  ['T', 'A', 'B'].forEach((c, i) =>
    g.fillText(c, 8, t0 + sp * 0.4 + (i * sp * (strings - 1)) / 2.4),
  );
  forBarLines(v.song, s.beat - s.hitX / s.ppb, s.beat + (w - s.hitX) / s.ppb, (b) => {
    const x = s.hitX + (b - s.beat) * s.ppb;
    if (x >= 30) line(g, x, t0, x, t0 + sp * (strings - 1));
  });
  forVisibleNotes(p, s.beat - s.hitX / s.ppb, s.beat + (w - s.hitX) / s.ppb, (n) => {
    const x = s.hitX + (n.t - s.beat) * s.ppb;
    if (x < 30 || x > w + 10) return;
    const y = t0 + n.lane * sp;
    points.set(n, { x, y });
    const label = String(n.fret ?? 0);
    g.font = `700 ${Math.round(sp * 0.82)}px ${FONT_MONO}`;
    const tw = g.measureText(label).width + 4;
    g.fillStyle = '#0f0d1e';
    g.fillRect(x - tw / 2, y - sp * 0.45, tw, sp * 0.9);
    g.fillStyle = noteColor(v, n);
    g.textAlign = 'center';
    g.fillText(label, x, y + sp * 0.3);
    g.textAlign = 'left';
  });
}

function line(g: Ctx, x1: number, y1: number, x2: number, y2: number) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}

/** Scrolling notation: a staff, a staff plus TAB for string instruments, or drum notation. */
export function drawNotation(v: ViewContext): HitPoint {
  const { g, p, w, h } = v;
  const s: Scroll = { beat: v.beat, hitX: clamp(w * 0.24, 70, 220), ppb: clamp(w / 7, 46, 120) };
  const points: Points = new Map();
  g.fillStyle = 'rgba(15,13,30,0.6)';
  g.fillRect(0, 0, w, h);
  if (p.instrument.view === 'strings') {
    if (h > 250) {
      drawStaff(v, 0, h * 0.5, s, points);
      drawTab(v, h * 0.5, h * 0.5, s, points);
    } else drawTab(v, 0, h, s, points);
  } else drawStaff(v, 0, h, s, points);
  g.fillStyle = withAlpha(p.instrument.color, 0.85);
  g.fillRect(s.hitX - 1.5, 6, 3, h - 12);
  g.fillStyle = withAlpha(p.instrument.color, 0.08);
  g.fillRect(s.hitX - 14, 6, 28, h - 12);
  return (n) => points.get(n) ?? { x: s.hitX, y: h / 2 };
}
