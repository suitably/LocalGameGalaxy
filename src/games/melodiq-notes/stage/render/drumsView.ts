import { DRUM_KICK_LANE } from '../../../../modules/music-score';
import { DEFAULT_DRUM_PADS, drumColorLane, drumKeyOf } from '../logic/drumLanes';
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

const KICK = DRUM_KICK_LANE;
const TOM_PAD = 3;

/**
 * Perspective highway (Guitar Hero style) with one lane per pad the song uses; the kick is a bar
 * across all lanes. Notes take their voice's colour (each tom its own); an open hi-hat is hollow,
 * display-only percussion is drawn faint (#571).
 */
export function drawDrums(v: ViewContext): HitPoint {
  const { g, p, w, h, beat, texts } = v;
  const kit = p.drumKit;
  const pads = kit?.pads ?? DEFAULT_DRUM_PADS;
  const n = pads.length;
  const col = (lane: number) => Math.max(0, pads.indexOf(lane));
  const { hitY, horizonY, cx, width, kickY } = drumGeometry(w, h);
  const persp = (z: number) => {
    const q = 1 / (1 + 2.4 * z);
    const k = (q - FAR) / (1 - FAR);
    return { y: horizonY + (hitY - horizonY) * k, s: 0.3 + 0.7 * k };
  };
  const laneX = (lane: number, s: number) => cx + ((col(lane) + 0.5) / n - 0.5) * width * s;

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
  for (let i = 0; i <= n; i++) {
    const f = i / n - 0.5;
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
  const shown = new Set(kit?.shown);
  const collect = (note: StageNote) => {
    const z = (note.t - beat) / LOOK_BEATS;
    if (z > -0.12 && z <= 1 && !(note.judged && note.judged !== 'miss')) visible.push(note);
  };
  forVisibleNotes(p, beat - 0.5, beat + LOOK_BEATS, collect);
  if (kit?.shown.length) forVisibleNotes(p, beat - 0.5, beat + LOOK_BEATS, collect, kit.shown);
  visible.sort((a, b) => b.t - a.t);
  for (const note of visible) {
    const q = persp((note.t - beat) / LOOK_BEATS);
    const c = note.judged === 'miss' ? MISS_COLOR : DRUM_LANE_META[drumColorLane(note)].color;
    const isKick = note.lane === KICK;
    if (isKick)
      roundRect(g, cx - (width * q.s) / 2 + 6, q.y - 4 * q.s, width * q.s - 12, 8 * q.s, 4 * q.s);
    else {
      const gw = ((width * q.s) / n) * 0.62;
      const gh = 18 * q.s;
      roundRect(g, laneX(note.lane, q.s) - gw / 2, q.y - gh / 2, gw, gh, gh / 2);
    }
    if (shown.has(note)) fillWithHalo(g, c, 2 * q.s, withAlpha(c, 0.35));
    else if (note.drum === 'hihatOpen') {
      g.lineWidth = 3 * q.s;
      g.strokeStyle = c;
      g.stroke();
    } else fillWithHalo(g, c, 6 * q.s);
    drawNoteMarks(
      g,
      note,
      isKick ? cx : laneX(note.lane, q.s),
      q.y,
      q.s,
      isKick ? width * q.s - 12 : 0,
    );
  }

  const rad = Math.max(10, Math.min(width / (2 * n) - 8, 40, h * 0.12));
  g.textAlign = 'center';
  for (const lane of pads) {
    const meta = DRUM_LANE_META[lane];
    const lit = p.pressed.has(lane) ? 1 : 0;
    const x = laneX(lane, 1);
    const key = drumKeyOf(lane, pads);
    g.strokeStyle = meta.color;
    g.lineWidth = 2.5 + lit * 3;
    g.fillStyle = withAlpha(meta.color, 0.08 + lit * 0.45);
    g.beginPath();
    g.ellipse(x, hitY, rad, rad * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    if (v.isFocus && key) {
      g.fillStyle = STAGE.ink;
      g.font = `700 12px ${FONT_MONO}`;
      g.fillText(key.key, x, hitY + 4);
    }
    if (h > 220) {
      g.fillStyle = withAlpha(STAGE.ink, 0.5);
      g.font = `600 10px ${FONT_BODY}`;
      const label = kit?.mergeToms && lane === TOM_PAD ? 'tom' : meta.id;
      g.fillText(texts.drum(label), x, hitY + rad * 0.42 + 13);
    }
  }
  const kick = DRUM_LANE_META[KICK];
  g.fillStyle = withAlpha(kick.color, 0.15 + (p.pressed.has(KICK) ? 0.55 : 0));
  g.strokeStyle = kick.color;
  g.lineWidth = 2;
  roundRect(g, cx - width / 2 + 10, kickY, width - 20, 18, 9);
  g.fill();
  g.stroke();
  g.fillStyle = STAGE.ink;
  g.font = `700 11px ${FONT_MONO}`;
  g.fillText(texts.drum('kick') + (v.isFocus ? ' · ␣' : ''), cx, kickY + 13);
  g.textAlign = 'left';

  return (note) => (note.lane === KICK ? { x: cx, y: kickY } : { x: laneX(note.lane, 1), y: hitY });
}

/** Voice glyph inside the note (open hi-hat, tom 2, ...) and sticking letter beside it. */
function drawNoteMarks(
  g: CanvasRenderingContext2D,
  n: StageNote,
  x: number,
  y: number,
  scale: number,
  barWidth: number,
) {
  if (scale < 0.55) return;
  const glyph = n.drum ? DRUM_GLYPH[n.drum] : undefined;
  g.textAlign = 'center';
  g.fillStyle = STAGE.ink;
  if (glyph && n.lane !== KICK) {
    g.font = `800 ${Math.round(11 * scale)}px ${FONT_MONO}`;
    g.fillText(glyph, x, y + 4 * scale);
  }
  if (n.hand) {
    const dx = barWidth ? barWidth / 2 - 10 : 50 * scale;
    g.font = `800 ${Math.round(12 * scale)}px ${FONT_MONO}`;
    g.fillStyle = withAlpha(STAGE.ink, 0.85);
    g.fillText(n.hand, x + (n.hand === 'L' ? -dx : dx), y + 4 * scale);
  }
  g.textAlign = 'left';
}
