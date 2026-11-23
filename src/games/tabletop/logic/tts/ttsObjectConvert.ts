/** TTS die, board, token, model and hand-trigger conversion [ID: GAME-TABLETOP-TTS-PARSER] */
import type { TTSObjectState } from '../ttsTypes';
import type { DieWidget, TokenWidget, HolderWidget } from '../types';
import { cardOrientation } from '../ttsFidelity';
import { TTS_SCALE, TOKEN_SIZE, DIE_SIZE } from './ttsConstants';
import { sanitizeTtsUrl } from './ttsUrl';
import { topLeft, ttsColorToHex } from './ttsGeometry';

export function convertDie(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  sides: number,
): DieWidget {
  return {
    id: obj.GUID,
    type: 'die',
    ...topLeft(pos, DIE_SIZE, DIE_SIZE),
    width: DIE_SIZE,
    height: DIE_SIZE,
    zIndex: pos.zIndex,
    label: obj.Nickname || `W${sides}`,
    currentValue: typeof obj.Value === 'number' ? obj.Value : 1,
    sides,
    color: ttsColorToHex(obj.ColorDiffuse),
    pipColor: '#222222',
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

export function convertBoard(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
): TokenWidget {
  const imageUrl = obj.CustomImage?.ImageURL ? sanitizeTtsUrl(obj.CustomImage.ImageURL) : undefined;
  const scaleX = obj.Transform.scaleX || 1;
  const scaleZ = obj.Transform.scaleZ || 1;
  const widthScale = obj.CustomImage?.WidthScale || 1;
  const imageScalar = obj.CustomImage?.ImageScalar || 1;
  const unitW = 24.5 * scaleX * widthScale;
  const unitH = 24.5 * scaleZ * imageScalar;
  const width = Math.round(unitW * TTS_SCALE);
  const height = Math.round(unitH * TTS_SCALE);

  return {
    id: obj.GUID,
    type: 'token',
    shape: 'rectangle',
    x: Math.round(pos.x - width / 2),
    y: Math.round(pos.y - height / 2),
    width,
    height,
    zIndex: 0,
    label: obj.Nickname || 'Board',
    ...(obj.Nickname ? {} : { labelKey: 'games.tabletop.labels.board' }),
    image: imageUrl,
    movable: false,
    pinned: true,
  };
}

export function convertToken(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
): TokenWidget {
  const imageUrl = obj.CustomImage?.ImageURL ? sanitizeTtsUrl(obj.CustomImage.ImageURL) : undefined;
  const scale = Math.max(obj.Transform.scaleX || 1, obj.Transform.scaleZ || 1);
  const rawSize = Math.round(TOKEN_SIZE * Math.min(Math.max(scale, 0.85), 3));
  const rawName = obj.Name || '';
  // A unit cube keeps its real footprint, so markers stacked on a board do not cover each other.
  const isBlock = rawName === 'BlockSquare';
  const size = isBlock ? Math.max(24, Math.round(scale * TTS_SCALE)) : Math.max(68, rawSize);

  const isGeneric = isBlock || rawName.startsWith('backgammon') || rawName.startsWith('PiecePack');
  const label = obj.Nickname || (isGeneric ? undefined : rawName);
  // A flat image piece is upright at rotY 180 (readable from the −Z side of the table).
  const rotation =
    rawName === 'Custom_Token' || rawName === 'Custom_Tile'
      ? cardOrientation(obj.Transform).rotation
      : 0;

  return {
    id: obj.GUID,
    type: 'token',
    ...topLeft(pos, size, size),
    width: size,
    height: size,
    zIndex: pos.zIndex,
    label,
    color: ttsColorToHex(obj.ColorDiffuse),
    image: imageUrl,
    ...(rotation ? { rotation } : {}),
    shape: isBlock ? 'square' : 'circle',
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

/**
 * `Custom_Model` (D7): the mesh's diffuse texture as a sprite, else a labelled token. Same rule
 * top level, in bags and in states; a top-down render of the mesh is slice 11.
 */
export function convertModel(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
): TokenWidget {
  const diffuse = sanitizeTtsUrl(obj.CustomMesh?.DiffuseURL) || undefined;
  return {
    ...convertToken(obj, pos),
    image: diffuse,
    // The texture is a UV atlas; the usual chip/tile layout has the front face first.
    ...(diffuse ? { imageFit: 'atlas-front' as const } : {}),
    label: obj.Nickname || undefined,
    ...(obj.Nickname ? {} : { labelKey: 'games.tabletop.labels.model' }),
  };
}

export function convertHandTrigger(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  seatIndex: number,
): HolderWidget {
  return {
    id: obj.GUID,
    type: 'holder',
    x: pos.x,
    y: pos.y,
    width: 340,
    height: 200,
    zIndex: pos.zIndex + 1000,
    label: `Player ${seatIndex + 1}`,
    labelKey: 'games.tabletop.labels.hand_n',
    labelParams: { n: seatIndex + 1 },
    dropTargetTypes: ['card'],
    childIds: [],
    layout: 'fan',
    isHand: true,
    ownerSeat: seatIndex,
    movable: false,
    pinned: true,
  };
}

// ─── Main Parser ─────────────────────────────────────────────────────
