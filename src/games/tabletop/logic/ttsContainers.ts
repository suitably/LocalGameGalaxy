/**
 * TTS bags, tile shapes and fog of war [ID: LOGIC-TABLETOP-TTS-CONTAINERS]
 *
 * Kept apart from `ttsParser.ts`; the parser passes in its converters so there is no cycle.
 */
import {
  HEX_CLIP_PATH,
  type BagWidget,
  type CardWidget,
  type HiddenZone,
  type TabletopWidget,
  type TokenWidget,
} from './types';
import type { TTSObjectState } from './ttsTypes';

type Pos = { x: number; y: number; zIndex: number };

/** Token shape for a `Custom_Tile`, from `CustomImage.CustomTile.Type`. */
export function tileShape(obj: TTSObjectState): Partial<TokenWidget> {
  switch (obj.CustomImage?.CustomTile?.Type ?? 0) {
    case 1:
      return { shape: 'square', clipPath: HEX_CLIP_PATH };
    case 2:
      return { shape: 'circle' };
    case 3:
      return { shape: 'square', borderRadius: '18%' };
    default: {
      const ratio = obj.CustomImage?.WidthScale;
      return {
        shape: ratio && Math.abs(ratio - 1) > 0.05 ? 'rectangle' : 'square',
        borderRadius: 4,
      };
    }
  }
}

function previewOf(w: TabletopWidget | undefined): {
  previewImage?: string;
  previewLabel?: string;
} {
  if (!w) return {};
  if (w.type === 'card') {
    const front = (w as CardWidget).frontContent;
    return {
      previewImage: front.type === 'image' ? front.value : undefined,
      previewLabel: w.label,
    };
  }
  return { previewImage: w.image, previewLabel: w.label };
}

/**
 * `Bag` → finite bag: its contents become hidden widgets listed in `itemIds` (drawn last-in
 * first-out). `Infinite_Bag` → infinite bag that clones its first object as `templateWidget`.
 */
export function convertBag(
  obj: TTSObjectState,
  pos: Pos,
  color: string,
  convertChild: (child: TTSObjectState, pos: Pos) => TabletopWidget,
  out: Record<string, TabletopWidget>,
): BagWidget {
  const isInfinite = obj.Name === 'Infinite_Bag';
  const childPos = { ...pos, zIndex: pos.zIndex + 1 };
  const children = (obj.ContainedObjects ?? []).map((c) => ({
    ...convertChild(c, childPos),
    movable: true,
    pinned: false,
  })) as TabletopWidget[];
  const base: BagWidget = {
    id: obj.GUID,
    type: 'bag',
    x: pos.x,
    y: pos.y,
    width: 80,
    height: 80,
    zIndex: pos.zIndex,
    label: obj.Nickname || undefined,
    color,
    isInfinite,
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
    ...previewOf(children[0]),
  };
  if (isInfinite) return { ...base, templateWidget: children[0] };
  for (const child of children) out[child.id] = child;
  return { ...base, itemIds: children.map((c) => c.id), itemCount: children.length };
}

/** `FogOfWarTrigger` → hidden zone owned by the seat of its fog colour (none = table/GM). */
export function convertFogOfWar(
  obj: TTSObjectState,
  center: { x: number; y: number },
  scale: number,
  ownerSeat: number | undefined,
  color: string,
): HiddenZone {
  const width = Math.max(80, Math.round((obj.Transform.scaleX || 1) * scale));
  const height = Math.max(80, Math.round((obj.Transform.scaleZ || 1) * scale));
  return {
    id: `fog_${obj.GUID}`,
    x: Math.round(center.x - width / 2),
    y: Math.round(center.y - height / 2),
    width,
    height,
    color,
    ownerSeat,
    label: obj.Nickname || undefined,
  };
}
