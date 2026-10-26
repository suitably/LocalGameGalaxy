import { DRUM_LANE_META } from '../logic/instruments';
import {
  FONT_BODY,
  FONT_MONO,
  forBarLines,
  forVisibleNotes,
  MISS_COLOR,
  roundRect,
  withAlpha,
  fillWithHalo,
  STAGE,
} from './common';
import { DRUM_GLYPH } from '../logic/drumGlyphs';
import { drumGeometry } from './geometry';
import type { StageNote } from '../logic/charts';
import type { HitPoint, ViewContext } from './view';

const LOOK_BEATS = 4.5;
const FAR = 1 / 3.4;
/** How far ahead of its note a flam's grace stroke is drawn (beats). */
const FLAM_LEAD_BEATS = 0.09;

/** Perspective highway (Guitar Hero style); the kick is a bar across all lanes. */
export function drawDrums(v: ViewContext): HitPoint {
  const { g, p, w, h, beat, texts } = v;
  const { hitY, horizonY, cx, width, kickY } = drumGeometry(w, h);
  const persp = (z: number) => {
    const q = 1 / (1 + 2.4 * z);
    const k = (q - FAR) / (1 - FAR);
    return { y: horizonY + (hitY - horizonY) * k, s: 0.3 + 0.7 * k };
  };
  const laneX = (i: number, s: number) => cx + ((i + 0.5) / 4 - 0.5) * width * s;

  const far = persp(1);
  const near = persp(-0.15);
  g.fillStyle = withAlpha(STAGE.ink, 0.03);
  g.beginPath();
  g.moveTo(cx - (width * far.s) / 2, far.y);
  g.lineTo(cx + (width * far.s) / 2, far.y);
  g.lineTo(cx + (width * near.s) / 2, near.y);
  g.lineTo(cx - (width * near.s) / 2, near.y);
  g.closePath();
  g.fill();
  g.lineWidth = 1;
  g.strokeStyle = withAlpha(STAGE.ink, 0.08);
  for (let i = 0; i <= 4; i++) {
    const f = i / 4 - 0.5;
    g.beginPath();
    g.moveTo(cx + f * width * far.s, far.y);
    g.lineTo(cx + f * width * near.s, near.y);
    g.stroke();
  }
  g.strokeStyle = withAlpha(STAGE.ink, 0.16);
  forBarLines(v.song, beat, beat + LOOK_BEATS, (b) => {
    const q = persp((b - beat) / LOOK_BEATS);
    g.beginPath();
    g.moveTo(cx - (width * q.s) / 2, q.y);
    g.lineTo(cx + (width * q.s) / 2, q.y);
    g.stroke();
  });

  const visible: StageNote[] = [];
  forVisibleNotes(p, beat - 0.5, beat + LOOK_BEATS, (n) => {
    const z = (n.t - beat) / LOOK_BEATS;
    if (z > -0.12 && z <= 1 && !(n.judged && n.judged !== 'miss')) visible.push(n);
  });
  visible.sort((a, b) => b.t - a.t);
  for (const n of visible) {
    const q = persp((n.t - beat) / LOOK_BEATS);
    const c = n.judged === 'miss' ? MISS_COLOR : DRUM_LANE_META[n.lane].color;
    if (n.lane === 4)
      roundRect(g, cx - (width * q.s) / 2 + 6, q.y - 4 * q.s, width * q.s - 12, 8 * q.s, 4 * q.s);
    else {
      const gw = ((width * q.s) / 4) * 0.62;
      const gh = 18 * q.s;
      if (n.flam) {
        // the grace stroke: a small pill just before the main one
        const f = persp((n.t - FLAM_LEAD_BEATS - beat) / LOOK_BEATS);
        roundRect(g, laneX(n.lane, f.s) - gw * 0.7, f.y - gh / 4, gw / 2, gh / 2, gh / 4);
        g.fillStyle = withAlpha(c, 0.6);
        g.fill();
      }
      roundRect(g, laneX(n.lane, q.s) - gw / 2, q.y - gh / 2, gw, gh, gh / 2);
    }
    fillWithHalo(g, c, 6 * q.s);
    const isKick = n.lane === 4;
    drawNoteMarks(
      g,
      n,
      isKick ? cx : laneX(n.lane, q.s),
      q.y,
      q.s,
      isKick ? width * q.s - 12 : 0,
      ((width * q.s) / 4) * 0.62,
    );
  }

  const rad = Math.min(width / 8 - 8, 40, h * 0.12);
  g.textAlign = 'center';
  for (let i = 0; i < 4; i++) {
    const meta = DRUM_LANE_META[i];
    const lit = p.pressed.has(i) ? 1 : 0;
    const x = laneX(i, 1);
    g.strokeStyle = meta.color;
    g.lineWidth = 2.5 + lit * 3;
    g.fillStyle = withAlpha(meta.color, 0.08 + lit * 0.45);
    g.beginPath();
    g.ellipse(x, hitY, rad, rad * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (v.isFocus) {
      g.fillStyle = STAGE.ink;
      g.font = `700 12px ${FONT_MONO}`;
      g.fillText(meta.key, x, hitY + 4);
    }
    if (h > 220) {
      g.fillStyle = withAlpha(STAGE.ink, 0.5);
      g.font = `600 10px ${FONT_BODY}`;
      g.fillText(texts.drum(meta.id), x, hitY + rad * 0.42 + 13);
    }
  }
  const kick = DRUM_LANE_META[4];
  g.fillStyle = withAlpha(kick.color, 0.15 + (p.pressed.has(4) ? 0.55 : 0));
  g.strokeStyle = kick.color;
  g.lineWidth = 2;
  roundRect(g, cx - width / 2 + 10, kickY, width - 20, 18, 9);
  g.fill();
  g.stroke();
  g.fillStyle = STAGE.ink;
  g.font = `700 11px ${FONT_MONO}`;
  g.fillText(texts.drum('kick') + (v.isFocus ? ` · ${kick.key}` : ''), cx, kickY + 13);
  g.textAlign = 'left';

  return (n) => (n.lane === 4 ? { x: cx, y: kickY } : { x: laneX(n.lane, 1), y: hitY });
}

/** Voice glyph inside the note (open hi-hat, tom 2, ...), accent and sticking letter beside it. */
function drawNoteMarks(
  g: CanvasRenderingContext2D,
  n: StageNote,
  x: number,
  y: number,
  scale: number,
  barWidth: number,
  padWidth: number,
) {
  if (scale < 0.55) return;
  const glyph = n.drum ? DRUM_GLYPH[n.drum] : undefined;
  g.textAlign = 'center';
  g.fillStyle = STAGE.ink;
  if (glyph && n.lane !== 4) {
    g.font = `800 ${Math.round(11 * scale)}px ${FONT_MONO}`;
    g.fillText(glyph, x, y + 4 * scale);
  }
  if (n.accent) {
    // just left of a pad note, at the left end of the kick bar (sticking sits on the right)
    const ax = barWidth ? x - barWidth / 2 + 14 : x - padWidth / 2 - 9 * scale;
    g.font = `900 ${Math.round(14 * scale)}px ${FONT_MONO}`;
    g.fillText('>', ax, y + 5 * scale);
  }
  if (n.hand) {
    const dx = barWidth ? barWidth / 2 - 10 : 50 * scale;
    g.font = `800 ${Math.round(12 * scale)}px ${FONT_MONO}`;
    g.fillStyle = withAlpha(STAGE.ink, 0.85);
    g.fillText(n.hand, x + (n.hand === 'L' ? -dx : dx), y + 4 * scale);
  }
  g.textAlign = 'left';
}
