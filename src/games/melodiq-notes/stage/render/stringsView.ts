import { STRING_COLORS } from '../logic/instruments';
import {
  clamp,
  FONT_BODY,
  FONT_MONO,
  forBarLines,
  forVisibleNotes,
  MISS_COLOR,
  roundRect,
  withAlpha,
  fillWithHalo,
  barLabel,
} from './common';
import { stringGeometry } from './geometry';
import { upcoming, type HitPoint, type ViewContext } from './view';

const VISIBLE_FRETS = 7;

/** Tab highway: strings as lanes, fret numbers on the notes, a fretboard showing the next grip. */
export function drawStrings(v: ViewContext): HitPoint {
  const { g, p, w, h, beat } = v;
  const geo = stringGeometry(p, w, h);
  const colors = p.instrument.kind === 'bass' ? STRING_COLORS.slice(2) : STRING_COLORS;
  const laneY = (i: number) => geo.top + i * geo.gap;
  const n = geo.strings.length;

  forBarLines(v.song, beat - geo.hitX / geo.pxPerBeat, beat + geo.lookBeats, (b, i) => {
    const x = geo.hitX + (b - beat) * geo.pxPerBeat;
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, geo.top - 14);
    g.lineTo(x, geo.bottom + 10);
    g.stroke();
    barLabel(g, String(i + 1), x + 4, geo.top - 18);
  });
  for (let i = 0; i < n; i++) {
    const y = laneY(i);
    const lit = p.pressed.has(i) ? 1 : 0;
    g.strokeStyle = withAlpha(colors[i], 0.32 + lit * 0.6);
    g.lineWidth =
      (p.instrument.kind === 'bass' ? 2 : 1.1) +
      i * (p.instrument.kind === 'bass' ? 0.6 : 0.4) +
      lit * 2;
    g.beginPath();
    g.moveTo(geo.hitX - 6, y);
    g.lineTo(w, y);
    g.stroke();
    g.textAlign = 'right';
    g.fillStyle = colors[i];
    g.font = `700 14px ${FONT_MONO}`;
    g.fillText(geo.strings[i], geo.hitX - (v.isFocus ? 26 : 12), y + 5);
    if (v.isFocus) {
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.font = `600 10px ${FONT_MONO}`;
      g.fillText(String(i + 1), geo.hitX - 12, y + 4);
    }
    g.textAlign = 'left';
  }
  const glow = g.createLinearGradient(geo.hitX - 5, 0, geo.hitX + 5, 0);
  glow.addColorStop(0, 'rgba(0,0,0,0)');
  glow.addColorStop(0.5, withAlpha(p.instrument.color, 0.75));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.fillRect(geo.hitX - 5, geo.top - 16, 10, geo.bottom - geo.top + 32);

  const r = clamp(geo.gap * 0.42, 8, 14);
  forVisibleNotes(p, beat - 0.5, beat + geo.lookBeats, (note) => {
    const x = geo.hitX + (note.t - beat) * geo.pxPerBeat;
    const len = Math.max(r * 2, note.dur * geo.pxPerBeat - 4);
    if (
      x > w + 30 ||
      x + len < geo.hitX - 30 ||
      (note.judged && note.judged !== 'miss' && x < geo.hitX - 2)
    )
      return;
    const y = laneY(note.lane);
    const c = note.judged === 'miss' ? MISS_COLOR : colors[note.lane];
    g.fillStyle = withAlpha(c, 0.22);
    roundRect(g, x, y - r * 0.35, len, r * 0.7, r * 0.35);
    g.fill();
    g.beginPath();
    g.arc(x + r, y, r, 0, Math.PI * 2);
    fillWithHalo(g, c, 5);
    g.fillStyle = '#0b0a15';
    g.font = `700 ${Math.round(r * 1.05)}px ${FONT_MONO}`;
    g.textAlign = 'center';
    g.fillText(String(note.fret ?? 0), x + r, y + r * 0.38);
    g.textAlign = 'left';
  });

  if (geo.fretboardH) drawFretboard(v, geo.fretboardH, colors);
  return (note) => ({ x: geo.hitX, y: laneY(note.lane) });
}

function drawFretboard(v: ViewContext, fbH: number, colors: string[]) {
  const { g, p, w, h, texts } = v;
  const n = p.instrument.kind === 'guitar' ? 6 : 4;
  const fy = h - fbH - 4;
  const fx = 12;
  const fw = w - 24;
  const next = upcoming(v);
  const minFret = next.length ? Math.max(0, Math.min(...next.map((x) => x.fret ?? 0)) - 2) : 0;
  const f0 = minFret <= 1 ? 0 : minFret;
  g.fillStyle = 'rgba(255,255,255,0.03)';
  roundRect(g, fx, fy, fw, fbH - 4, 12);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.font = `600 11px ${FONT_BODY}`;
  g.fillText(texts.nextGrip + (f0 > 0 ? ` · ${texts.fromFret(f0)}` : ''), fx + 10, fy + 15);
  const sTop = fy + 24;
  const sGap = (fbH - 40) / (n - 1);
  const step = (fw - 50) / VISIBLE_FRETS;
  for (let f = 0; f <= VISIBLE_FRETS; f++) {
    const x = fx + 40 + f * step;
    const nut = f === 0 && f0 === 0;
    g.strokeStyle = nut ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.18)';
    g.lineWidth = nut ? 4 : 1.5;
    g.beginPath();
    g.moveTo(x, sTop - 4);
    g.lineTo(x, sTop + sGap * (n - 1) + 4);
    g.stroke();
    if (f > 0) {
      g.fillStyle = 'rgba(255,255,255,0.3)';
      g.font = `500 10px ${FONT_MONO}`;
      g.textAlign = 'center';
      g.fillText(String(f0 + f), x - step / 2, fy + fbH - 9);
      g.textAlign = 'left';
    }
  }
  for (let i = 0; i < n; i++) {
    g.strokeStyle = withAlpha(colors[i], 0.5);
    g.lineWidth = 1 + i * 0.4;
    g.beginPath();
    g.moveTo(fx + 40, sTop + i * sGap);
    g.lineTo(fx + fw - 10, sTop + i * sGap);
    g.stroke();
  }
  for (const nx of next) {
    const fret = nx.fret ?? 0;
    const x = fret === 0 ? fx + 28 : fx + 40 + (fret - f0) * step - step / 2;
    const y = sTop + nx.lane * sGap;
    g.beginPath();
    g.arc(x, y, Math.min(10, sGap * 0.5 + 3), 0, Math.PI * 2);
    fillWithHalo(g, colors[nx.lane], 6);
    g.fillStyle = '#0b0a15';
    g.font = `700 10px ${FONT_MONO}`;
    g.textAlign = 'center';
    g.fillText(fret === 0 ? 'o' : String(fret), x, y + 4);
    g.textAlign = 'left';
  }
}
