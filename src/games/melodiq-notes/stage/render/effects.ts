import { JUDGEMENT_COLORS } from '../logic/instruments';
import type { StagePlayer } from '../engine/types';
import { clamp, FONT_DISPLAY, type Ctx, type StageTexts } from './common';
import type { HitPoint } from './view';

interface Ring {
  x: number;
  y: number;
  life: number;
  color: string;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
interface Label {
  x: number;
  y: number;
  life: number;
  color: string;
  text: string;
}

/** Per-player effect state that lives only in the renderer. */
export interface PlayerEffects {
  rings: Ring[];
  sparks: Spark[];
  labels: Label[];
}

export const newEffects = (): PlayerEffects => ({ rings: [], sparks: [], labels: [] });

const SPARKS_PER_HIT = 3;

/** Turns the player's new judgements into a ring, a few sparks (only for clean hits) and a word. */
export function collectEffects(p: StagePlayer, fx: PlayerEffects, at: HitPoint, texts: StageTexts) {
  for (const e of p.fx.splice(0)) {
    const pt = at(e.note);
    const color =
      e.kind === 'learn'
        ? p.instrument.color
        : e.kind === 'wrong'
          ? JUDGEMENT_COLORS.miss
          : JUDGEMENT_COLORS[e.kind];
    fx.labels.push({
      x: pt.x,
      y: pt.y - 22,
      life: e.kind === 'wrong' ? 0.8 : 1,
      color,
      text: texts.judgement[e.kind],
    });
    if (e.kind === 'miss' || e.kind === 'wrong') continue;
    fx.rings.push({ x: pt.x, y: pt.y, life: 1, color });
    if (e.kind === 'good') continue;
    for (let i = 0; i < SPARKS_PER_HIT; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 70 + Math.random() * 90;
      fx.sparks.push({
        x: pt.x,
        y: pt.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.35,
        color,
      });
    }
  }
}

export function drawEffects(g: Ctx, fx: PlayerEffects, dt: number, compact: boolean) {
  fx.rings = fx.rings.filter((r) => (r.life -= dt * 3) > 0);
  for (const r of fx.rings) {
    g.globalAlpha = r.life * 0.7;
    g.strokeStyle = r.color;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(r.x, r.y, 10 + (1 - r.life) * 22, 0, Math.PI * 2);
    g.stroke();
  }
  for (const s of fx.sparks) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 300 * dt;
    s.life -= dt;
  }
  fx.sparks = fx.sparks.filter((s) => s.life > 0);
  for (const s of fx.sparks) {
    g.globalAlpha = clamp(s.life * 3, 0, 1);
    g.fillStyle = s.color;
    g.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
  }
  for (const l of fx.labels) {
    l.life -= dt * 1.6;
    l.y -= 30 * dt;
  }
  fx.labels = fx.labels.filter((l) => l.life > 0);
  g.textAlign = 'center';
  g.font = `800 ${compact ? 14 : 17}px ${FONT_DISPLAY}`;
  for (const l of fx.labels) {
    g.globalAlpha = clamp(l.life * 1.5, 0, 1);
    g.fillStyle = l.color;
    g.fillText(l.text, l.x, l.y);
  }
  g.globalAlpha = 1;
  g.textAlign = 'left';
}
