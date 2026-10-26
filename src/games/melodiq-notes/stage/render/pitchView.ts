import { noteName } from '../logic/charts';
import {
  clamp,
  FONT_BODY,
  FONT_MONO,
  forBarLines,
  forVisibleNotes,
  MISS_COLOR,
  roundRect,
  withAlpha,
  fadeIfPlayed,
  STAGE,
} from './common';
import { pitchGeometry } from './geometry';
import type { HitPoint, ViewContext } from './view';

/** Pitch bars with lyrics (SingStar style), used for vocals and melody instruments. */
export function drawPitch(v: ViewContext): HitPoint {
  const { g, p, w, h, beat } = v;
  const color = p.instrument.color;
  const geo = pitchGeometry(p, w, h);
  g.lineWidth = 1;
  for (let q = Math.ceil(geo.lo); q < geo.hi; q++) {
    const y = geo.yOf(q);
    g.strokeStyle = q % 12 === 0 ? withAlpha(STAGE.ink, 0.12) : withAlpha(STAGE.ink, 0.035);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
    if (q % 12 === 0) {
      g.fillStyle = withAlpha(STAGE.ink, 0.35);
      g.font = `600 10px ${FONT_MONO}`;
      g.fillText(noteName(q), 6, y + 3);
    }
  }
  const back = geo.hitX / geo.pxPerBeat;
  g.strokeStyle = withAlpha(STAGE.ink, 0.07);
  forBarLines(v.song, beat - back, beat + geo.lookBeats, (b) => {
    const x = geo.hitX + (b - beat) * geo.pxPerBeat;
    g.beginPath();
    g.moveTo(x, geo.top);
    g.lineTo(x, geo.bottom);
    g.stroke();
  });
  g.fillStyle = withAlpha(color, 0.6);
  g.fillRect(geo.hitX - 1, geo.top - 6, 2, geo.bottom - geo.top + 12);

  forVisibleNotes(p, beat - back, beat + geo.lookBeats, (n) => {
    const x = geo.hitX + (n.t - beat) * geo.pxPerBeat;
    const bw = Math.max(10, n.dur * geo.pxPerBeat - 4);
    if (x > w || x + bw < 0) return;
    fadeIfPlayed(g, n, beat);
    const y = geo.yOf(n.pitch);
    const bh = Math.max(5, geo.laneH * 0.78);
    g.fillStyle = withAlpha(STAGE.ink, 0.06);
    g.strokeStyle = withAlpha(n.judged === 'miss' ? MISS_COLOR : color, 0.85);
    g.lineWidth = 1.5;
    roundRect(g, x, y - bh / 2, bw, bh, bh / 2);
    g.fill();
    g.stroke();
    const sung = clamp(n.acc / n.dur, 0, 1);
    if (sung > 0) {
      g.save();
      roundRect(g, x, y - bh / 2, bw, bh, bh / 2);
      g.clip();
      g.fillStyle = STAGE.perfect;
      g.fillRect(x, y - bh / 2, bw * sung, bh);
      g.restore();
    }
    if (p.instrument.kind === 'vocals' && n.syl) {
      const active = beat >= n.t && beat < n.t + n.dur;
      g.fillStyle = active
        ? STAGE.ink
        : n.t + n.dur <= beat
          ? withAlpha(STAGE.ink, 0.35)
          : withAlpha(STAGE.ink, 0.7);
      g.font = `${active ? 700 : 600} 15px ${FONT_BODY}`;
      g.fillText(n.syl, x, h - 18);
    }
  });
  g.globalAlpha = 1;

  g.strokeStyle = color;
  g.lineWidth = 3.5;
  g.lineCap = 'round';
  let drawing = false;
  g.beginPath();
  for (const s of p.history) {
    if (s.pitch === null) {
      drawing = false;
      continue;
    }
    const x = geo.hitX + (s.beat - beat) * geo.pxPerBeat;
    const y = geo.yOf(s.pitch);
    if (drawing) g.lineTo(x, y);
    else g.moveTo(x, y);
    drawing = true;
  }
  g.stroke();
  const py = geo.yOf(p.voice.pitch);
  g.fillStyle = p.voice.singing ? color : withAlpha(STAGE.ink, 0.25);
  g.beginPath();
  g.arc(geo.hitX, py, p.voice.singing ? 8 : 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = withAlpha(STAGE.ink, 0.6);
  g.font = `600 11px ${FONT_MONO}`;
  g.fillText(noteName(Math.round(p.voice.pitch)), geo.hitX + 12, py + 4);

  return (n) => ({ x: geo.hitX, y: geo.yOf(n.pitch) });
}
