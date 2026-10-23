import { pitchClassName, noteName } from '../logic/charts';
import {
  clamp,
  FONT_BODY,
  FONT_MONO,
  forBarLines,
  forVisibleNotes,
  MISS_COLOR,
  roundRect,
  withAlpha,
  barLabel,
} from './common';
import { keyGeometry } from './geometry';
import { upcoming, type HitPoint, type ViewContext } from './view';

const LOOK_BEATS = 4.2;
const KEY_LABELS: Record<number, string> = {
  0: 'A',
  2: 'S',
  4: 'D',
  5: 'F',
  7: 'G',
  9: 'H',
  11: 'J',
  12: 'K',
};

/** Notes fall onto a real keyboard (flowkey style). */
export function drawKeys(v: ViewContext): HitPoint {
  const { g, p, w, h, beat } = v;
  const color = p.instrument.color;
  const geo = keyGeometry(p, w, h, v.isFocus);
  const ppb = (geo.hitY - 8) / LOOK_BEATS;

  g.lineWidth = 1;
  forBarLines(v.song, beat, beat + LOOK_BEATS, (b, i) => {
    const y = geo.hitY - (b - beat) * ppb;
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
    barLabel(g, String(i + 1), 4, y - 4);
  });

  g.save();
  g.beginPath();
  g.rect(0, 0, w, geo.hitY);
  g.clip();
  forVisibleNotes(p, beat, beat + LOOK_BEATS, (n) => {
    const k = geo.keys[n.lane];
    if (!k) return;
    const yb = geo.hitY - (n.t - beat) * ppb;
    const nh = Math.max(8, n.dur * ppb - 3);
    if (yb < 0 || yb - nh > geo.hitY) return;
    const c = n.judged === 'miss' ? MISS_COLOR : color;
    const done = !!n.judged && n.judged !== 'miss';
    g.shadowColor = c;
    g.shadowBlur = done ? 18 : 8;
    g.fillStyle = withAlpha(c, done ? 1 : 0.88);
    roundRect(g, k.x + 1.5, yb - nh, k.w - 3, nh, Math.min(6, k.w / 3));
    g.fill();
    g.shadowBlur = 0;
    if (nh > 20 && k.w > 16) {
      g.fillStyle = '#0b0a15';
      g.font = `700 ${Math.min(13, k.w * 0.55)}px ${FONT_BODY}`;
      g.textAlign = 'center';
      g.fillText(pitchClassName(n.pitch), k.x + k.w / 2, yb - 7);
      g.textAlign = 'left';
    }
  });
  g.restore();

  const glow = g.createLinearGradient(0, geo.hitY - 12, 0, geo.hitY);
  glow.addColorStop(0, 'rgba(0,0,0,0)');
  glow.addColorStop(1, withAlpha(color, 0.3));
  g.fillStyle = glow;
  g.fillRect(0, geo.hitY - 12, w, 12);

  const targets = new Set(
    upcoming(v)
      .filter((n) => n.t - beat < 1.2)
      .map((n) => n.lane),
  );
  const drawKey = (m: number) => {
    const k = geo.keys[m];
    const y = geo.hitY + 2;
    const kh = k.black ? geo.keyHeight * 0.62 : geo.keyHeight - 4;
    g.fillStyle = p.pressed.has(m) ? color : k.black ? '#1a1830' : '#e9e7f5';
    roundRect(g, k.x + (k.black ? 0 : 1), y, k.w - (k.black ? 0 : 2), kh, k.black ? 3 : 5);
    g.fill();
    if (targets.has(m) && !p.pressed.has(m)) {
      const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
      g.strokeStyle = withAlpha(color, 0.5 + a * 0.5);
      g.lineWidth = 3;
      roundRect(g, k.x + 2.5, y + 2, k.w - 5, kh - 4, 4);
      g.stroke();
    }
    if (k.black || k.w <= 14) return;
    g.textAlign = 'center';
    const label = v.isFocus ? KEY_LABELS[m - p.octaveBase] : undefined;
    if (label) {
      g.fillStyle = p.pressed.has(m) ? '#0b0a15' : 'rgba(30,26,60,0.6)';
      g.font = `700 ${Math.min(11, k.w * 0.5)}px ${FONT_MONO}`;
      g.fillText(label, k.x + k.w / 2, y + kh - 8);
    }
    if (m % 12 === 0) {
      g.fillStyle = 'rgba(30,26,60,0.45)';
      g.font = `600 9px ${FONT_BODY}`;
      g.fillText(noteName(m), k.x + k.w / 2, y + kh - 22);
    }
    g.textAlign = 'left';
  };
  geo.whites.forEach(drawKey);
  for (let m = geo.lo; m <= geo.hi; m++) if (geo.keys[m].black) drawKey(m);

  return (n) => {
    const k = geo.keys[n.lane] ?? geo.keys[geo.whites[0]];
    return { x: k.x + k.w / 2, y: clamp(geo.hitY, 0, h) };
  };
}
