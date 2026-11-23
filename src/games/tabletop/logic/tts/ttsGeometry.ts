/** TTS geometry and small value helpers [ID: GAME-TABLETOP-TTS-PARSER] */
import type {
  TTSCustomDeckEntry,
  TTSObjectState,
  TTSSnapPoint,
  TTSTransform,
  TTSVector3,
} from '../ttsTypes';
import { HEX_CLIP_PATH, CIRCLE_CLIP_PATH, type HolderWidget } from '../types';
import { TTS_SCALE, CARD_W, CARD_H, CUSTOM_TABLE } from './ttsConstants';

export function getCardShapeAndSize(
  deck?: TTSCustomDeckEntry,
  transform?: TTSTransform,
): {
  width: number;
  height: number;
  clipPath?: string;
} {
  if (deck?.Type === 2 || deck?.Type === 3) {
    // Hex cards: TTS hex base is ~1.15 aspect ratio
    return { width: 210, height: 182, clipPath: HEX_CLIP_PATH };
  }
  if (deck?.Type === 4) {
    // Circle cards
    return { width: 100, height: 100, clipPath: CIRCLE_CLIP_PATH };
  }
  return {
    width: Math.round(CARD_W * (transform?.scaleX || 1)),
    height: Math.round(CARD_H * (transform?.scaleZ || 1)),
  };
}

/** Top-left corner of a widget of the given size centred on a projected object position. */
export function topLeft(pos: { x: number; y: number }, width: number, height: number) {
  return { x: Math.round(pos.x - width / 2), y: Math.round(pos.y - height / 2) };
}

// ─── Detection ───────────────────────────────────────────────────────

export function ttsColorToHex(c?: { r: number; g: number; b: number }): string {
  if (!c) return '#ffffff';
  const r = Math.round(Math.min(1, Math.max(0, c.r)) * 255);
  const g = Math.round(Math.min(1, Math.max(0, c.g)) * 255);
  const b = Math.round(Math.min(1, Math.max(0, c.b)) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Die name → sides ────────────────────────────────────────────────

export function parseDieSides(name: string): number | null {
  const match = name.match(/^Die_(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
}

// ─── 3D → 2D coordinate projection ──────────────────────────────────

export interface BoundingBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function computeBounds(objects: TTSObjectState[], hasTableImage: boolean): BoundingBox {
  let minX = hasTableImage ? -CUSTOM_TABLE.width / 2 : Infinity,
    maxX = hasTableImage ? CUSTOM_TABLE.width / 2 : -Infinity;
  let minZ = hasTableImage ? -CUSTOM_TABLE.depth / 2 : Infinity,
    maxZ = hasTableImage ? CUSTOM_TABLE.depth / 2 : -Infinity;

  for (const obj of objects) {
    const { posX, posZ } = obj.Transform;
    let halfW = 0;
    let halfZ = 0;
    if (obj.Name === 'Custom_Board') {
      const scaleX = obj.Transform.scaleX || 1;
      const scaleZ = obj.Transform.scaleZ || 1;
      const widthScale = obj.CustomImage?.WidthScale || 1;
      const imageScalar = obj.CustomImage?.ImageScalar || 1;
      halfW = (24.5 * scaleX * widthScale) / 2;
      halfZ = (24.5 * scaleZ * imageScalar) / 2;
    }
    if (posX - halfW < minX) minX = posX - halfW;
    if (posX + halfW > maxX) maxX = posX + halfW;
    if (posZ - halfZ < minZ) minZ = posZ - halfZ;
    if (posZ + halfZ > maxZ) maxZ = posZ + halfZ;
  }

  // Fallback for single-object or empty scenes
  if (!isFinite(minX)) {
    minX = 0;
    maxX = 10;
  }
  if (!isFinite(minZ)) {
    minZ = 0;
    maxZ = 10;
  }

  return { minX, maxX, minZ, maxZ };
}

export function projectPosition(
  obj: TTSObjectState,
  bounds: BoundingBox,
  margin: number,
): { x: number; y: number; zIndex: number } {
  // TTS looks down on the table with +Z away from the viewer: +Z is up on screen.
  const x = (obj.Transform.posX - bounds.minX) * TTS_SCALE + margin;
  const y = (bounds.maxZ - obj.Transform.posZ) * TTS_SCALE + margin;
  // posY (height) → zIndex — higher objects are on top
  const zIndex = Math.round(obj.Transform.posY * 100);
  return { x: Math.round(x), y: Math.round(y), zIndex: Math.max(1, zIndex) };
}

export function calculateWorldPosOfSnapPoint(
  parentObj: TTSObjectState,
  spPos: TTSVector3,
): { x: number; z: number } {
  const rotYDeg = parentObj.Transform.rotY || 0;
  const rotYRad = (rotYDeg * Math.PI) / 180;
  const cos = Math.cos(rotYRad);
  const sin = Math.sin(rotYRad);
  const scaleX = parentObj.Transform.scaleX || 1;
  const scaleZ = parentObj.Transform.scaleZ || 1;
  // Custom_Board snap points are stored in visual-space local coords, which include
  // the WidthScale and ImageScalar stretch. We must apply these before rotating so
  // the resulting world position aligns with the stretched board image in 2D.
  const widthScale = parentObj.CustomImage?.WidthScale || 1;
  const imageScalar = parentObj.CustomImage?.ImageScalar || 1;

  const localX = spPos.x * widthScale;
  const localZ = spPos.z * imageScalar;

  const rotX = localX * cos + localZ * sin;
  const rotZ = -localX * sin + localZ * cos;

  return {
    x: parentObj.Transform.posX + rotX * scaleX,
    z: parentObj.Transform.posZ + rotZ * scaleZ,
  };
}

export function projectWorldPos(
  worldPos: { x: number; z: number },
  bounds: BoundingBox,
  margin: number,
): { x: number; y: number } {
  const x = (worldPos.x - bounds.minX) * TTS_SCALE + margin;
  const y = (bounds.maxZ - worldPos.z) * TTS_SCALE + margin;
  return { x: Math.round(x), y: Math.round(y) };
}

export function createSnapHolderWidget(
  id: string,
  screenX: number,
  screenY: number,
  zIndex: number,
  sp: TTSSnapPoint,
  hasHexDeck: boolean,
): HolderWidget {
  const isHex = sp.Tags?.some((t) => /feld|hex/i.test(t)) || hasHexDeck;
  const snapW = isHex ? 210 : 80;
  const snapH = isHex ? 182 : 120;
  const label = sp.Tags?.[0];

  return {
    id,
    type: 'holder',
    x: Math.round(screenX - snapW / 2),
    y: Math.round(screenY - snapH / 2),
    width: snapW,
    height: snapH,
    zIndex,
    label: label ?? 'Zone',
    ...(label ? {} : { labelKey: 'games.tabletop.labels.zone' }),
    dropTargetTypes: ['card', 'token'],
    childIds: [],
    layout: 'stack',
    dropTarget: true,
    pinned: true,
    movable: false,
    clipPath: isHex ? HEX_CLIP_PATH : undefined,
    customCss: 'transparent',
  };
}

// ─── Card sprite content builder ─────────────────────────────────────
