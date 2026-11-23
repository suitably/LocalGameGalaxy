/**
 * TTS world ↔ table pixels for the Lua runtime [ID: LOGIC-TABLETOP-LUA-PROJECTION]
 *
 * The inverse of the importer's `projectPosition` (`ttsParser.ts`): a widget's centre is the
 * TTS world `x`/`z` of its object (+Z is up on screen), its `zIndex` / 100 the height `y`. The
 * importer stores the bounds it used in `scripts.projection`; games without them get a
 * projection centred on the table.
 */
import type { TabletopGameDefinition, TabletopWidget } from './types';

export interface LuaProjection {
  /** World `x` at the table's left margin and world `z` at its top margin. */
  minX: number;
  maxZ: number;
  /** Pixels per TTS unit. */
  scale: number;
  margin: number;
}

export interface LuaVector {
  x: number;
  y: number;
  z: number;
}

/** The importer's scale (`TTS_SCALE`) and margin. */
export const DEFAULT_TTS_SCALE = 50;
export const DEFAULT_TTS_MARGIN = 80;

export function projectionOf(game: Pick<TabletopGameDefinition, 'table' | 'scripts'>) {
  const stored = game.scripts?.projection;
  if (stored) return stored;
  const scale = DEFAULT_TTS_SCALE;
  const margin = DEFAULT_TTS_MARGIN;
  return {
    scale,
    margin,
    minX: -(game.table.width / 2 - margin) / scale,
    maxZ: (game.table.height / 2 - margin) / scale,
  } satisfies LuaProjection;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** World position of a widget's centre. */
export function widgetToWorld(w: TabletopWidget, p: LuaProjection): LuaVector {
  const cx = w.x + w.width / 2;
  const cy = w.y + w.height / 2;
  return {
    x: round3((cx - p.margin) / p.scale + p.minX),
    y: round3(Math.max(0, w.zIndex) / 100),
    z: round3(p.maxZ - (cy - p.margin) / p.scale),
  };
}

/** Top-left pixel of a widget of this size centred on the world position. */
export function worldToTopLeft(
  pos: { x: number; z: number },
  size: { width: number; height: number },
  p: LuaProjection,
): { x: number; y: number } {
  const cx = (pos.x - p.minX) * p.scale + p.margin;
  const cy = (p.maxZ - pos.z) * p.scale + p.margin;
  return { x: Math.round(cx - size.width / 2), y: Math.round(cy - size.height / 2) };
}

/** A TTS vector argument: `{x=…, y=…, z=…}` or `{1, 2, 3}`; missing axes are undefined. */
export function readVector(value: unknown): Partial<LuaVector> {
  if (value === null || typeof value !== 'object') return {};
  const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : undefined);
  // wasmoon hands `{1, 2, 3}` over as a JS array (index 0 = Lua 1)
  if (Array.isArray(value)) return { x: num(value[0]), y: num(value[1]), z: num(value[2]) };
  const v = value as Record<string, unknown>;
  return { x: num(v.x), y: num(v.y), z: num(v.z) };
}

const normalizeDeg = (deg: number) => ((Math.round(deg) % 360) + 360) % 360;

/** TTS rotation of a widget: `y` is the turn on the table, `z` 180 for a face-down card. */
export function widgetRotation(w: TabletopWidget): LuaVector {
  const rotation = 'rotation' in w && typeof w.rotation === 'number' ? w.rotation : 0;
  const faceDown = (w.type === 'card' || w.type === 'deck') && w.faceUp === false;
  // inverse of `cardOrientation`: rotation = rotY + 180
  return { x: 0, y: normalizeDeg(rotation - 180), z: faceDown ? 180 : 0 };
}

/** Table rotation (degrees) for a TTS `rotY`. */
export const rotationFromTts = (rotY: number): number => normalizeDeg(rotY + 180);
