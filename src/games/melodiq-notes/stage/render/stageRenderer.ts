import { accuracy, multiplier } from '../logic/judging';
import { panelRects, type Rect } from '../logic/layout';
import type { StageEngine } from '../engine/StageEngine';
import type { StagePlayer } from '../engine/types';
import {
  clamp,
  drawPanelBackground,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_MONO,
  HEADER_H,
  withAlpha,
  type Ctx,
  type StageTexts,
  STAGE,
} from './common';
import { drawDrums } from './drumsView';
import { collectEffects, drawEffects, newEffects, type PlayerEffects } from './effects';
import { fitHeaderSegments, HEADER_LEFT_X } from './headerFit';
import { drawKeys } from './keysView';
import { drawNotation } from './notationView';
import { drawPitch } from './pitchView';
import { drawStrings } from './stringsView';
import type { HitPoint, ViewContext } from './view';

export type StageDisplay = 'instrument' | 'notation';
const IDLE_BEAT = -1.2;

/** Renderer-side state that survives frames (effects per player). */
export class StageRenderer {
  private effects = new WeakMap<StagePlayer, PlayerEffects>();
  /** prefers-reduced-motion: no beat pulse on the panel backgrounds. */
  reducedMotion = false;

  draw(
    g: Ctx,
    engine: StageEngine,
    width: number,
    height: number,
    display: StageDisplay,
    texts: StageTexts,
    dt: number,
  ) {
    g.fillStyle = STAGE.bgBottom;
    g.fillRect(0, 0, width, height);
    const song = engine.song;
    if (!song || !engine.players.length) {
      g.fillStyle = STAGE.muted;
      g.font = `600 15px ${FONT_BODY}`;
      g.textAlign = 'center';
      g.fillText(texts.noPlayers, width / 2, height / 2);
      g.textAlign = 'left';
      return;
    }
    const rects = panelRects(engine.players.length, width, height);
    const beat = engine.state === 'idle' ? IDLE_BEAT : engine.beat;
    const pulse =
      !this.reducedMotion && engine.state === 'playing' && beat >= 0
        ? (1 - (beat - Math.floor(beat))) ** 3
        : 0;
    engine.players.forEach((p, i) => {
      const r = rects[i];
      g.save();
      g.beginPath();
      g.rect(r.x, r.y, r.w, r.h);
      g.clip();
      g.translate(r.x, r.y);
      drawPanelBackground(g, p.instrument.color, r.w, r.h, pulse);
      g.save();
      g.translate(0, HEADER_H);
      const v: ViewContext = {
        g,
        p,
        song,
        w: r.w,
        h: r.h - HEADER_H,
        beat,
        isFocus: p === engine.focus,
        idle: engine.state === 'idle',
        texts,
      };
      const at = this.drawView(v, display);
      let fx = this.effects.get(p);
      if (!fx) this.effects.set(p, (fx = newEffects()));
      collectEffects(p, fx, at, texts);
      drawEffects(g, fx, dt, engine.players.length > 1);
      g.restore();
      drawHeader(g, p, r.w, engine.players.length > 1, p === engine.focus, texts);
      g.restore();
    });
    if (engine.state === 'playing' && engine.beat < 0) drawCountIn(g, engine, width, height);
  }

  private drawView(v: ViewContext, display: StageDisplay): HitPoint {
    if (display === 'notation') return drawNotation(v);
    switch (v.p.instrument.view) {
      case 'keys':
        return drawKeys(v);
      case 'strings':
        return drawStrings(v);
      case 'drums':
        return drawDrums(v);
      default:
        return drawPitch(v);
    }
  }
}

function drawHeader(
  g: Ctx,
  p: StagePlayer,
  w: number,
  several: boolean,
  focus: boolean,
  texts: StageTexts,
) {
  g.fillStyle = withAlpha(STAGE.bgBottom, 0.78);
  g.fillRect(0, 0, w, HEADER_H);
  g.fillStyle = focus ? p.instrument.color : withAlpha(p.instrument.color, 0.45);
  g.fillRect(0, HEADER_H - 2, w, 2);
  g.textBaseline = 'middle';
  g.fillStyle = p.instrument.color;
  g.beginPath();
  g.arc(12, HEADER_H / 2, 4.5, 0, Math.PI * 2);
  g.fill();
  const s = p.stats;
  const acc = s.judged ? `${Math.round(accuracy(s) * 100)} %` : '–';
  const score = s.score.toLocaleString();
  const mult = `${score}  ×${multiplier(s.combo)}`;
  const fonts = {
    label: `700 13px ${FONT_BODY}`,
    part: `500 12px ${FONT_BODY}`,
    score: `700 13px ${FONT_MONO}`,
  } as const;
  const layout = fitHeaderSegments(
    {
      width: w,
      player: p.name ?? (several ? texts.player(p.no) : null),
      instrument: texts.instrument(p.instrument.kind),
      focusMarker: several && focus ? texts.keyboardFocus : null,
      partName: p.part.name,
      rightOptions: [
        `${mult}  ${texts.combo} ${s.combo}  ${acc}`,
        `${mult}  ${texts.combo} ${s.combo}`,
        mult,
        score,
      ],
    },
    (text, role) => {
      g.font = fonts[role];
      return g.measureText(text).width;
    },
  );
  g.fillStyle = STAGE.ink;
  g.font = fonts.label;
  g.fillText(layout.label, HEADER_LEFT_X, HEADER_H / 2);
  if (layout.part !== null) {
    g.fillStyle = STAGE.muted;
    g.font = fonts.part;
    g.fillText(layout.part, layout.partX, HEADER_H / 2);
  }
  g.textAlign = 'right';
  g.font = fonts.score;
  g.fillStyle = STAGE.ink;
  g.fillText(layout.right, layout.rightX, HEADER_H / 2);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
}

function drawCountIn(g: Ctx, engine: StageEngine, width: number, height: number) {
  const n = Math.ceil(-engine.beat);
  const f = -engine.beat - Math.floor(-engine.beat);
  g.textAlign = 'center';
  g.globalAlpha = clamp(f * 1.4, 0, 1);
  g.font = `800 ${Math.round(Math.min(width, height) * 0.2)}px ${FONT_DISPLAY}`;
  g.fillStyle = engine.focus?.instrument.color ?? STAGE.ink;
  g.fillText(String(n), width / 2, height / 2 + Math.min(width, height) * 0.07);
  g.globalAlpha = 1;
  g.textAlign = 'left';
}

export interface PointerTarget {
  player: StagePlayer;
  rect: Rect;
  /** Position inside the player's play area (below the header). */
  x: number;
  y: number;
  onHeader: boolean;
}

export function locatePointer(
  engine: StageEngine,
  width: number,
  height: number,
  x: number,
  y: number,
): PointerTarget | null {
  const rects = panelRects(engine.players.length, width, height);
  const i = rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  if (i < 0 || !engine.players[i]) return null;
  const r = rects[i];
  return {
    player: engine.players[i],
    rect: r,
    x: x - r.x,
    y: y - r.y - HEADER_H,
    onHeader: y - r.y < HEADER_H,
  };
}
