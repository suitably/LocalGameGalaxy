/**
 * Where a holder puts its children [ID: LOGIC-TABLETOP-HOLDER-LAYOUT]
 *
 * Pure position math for hand, stack, fan and grid holders; `applyLayout` writes the result
 * into a widget map. The reducer decides who is in which holder, this module only where.
 */
import { calculateHandLayout } from './handLayout';
import { isHandHolder } from './handHolder';
import type { CardWidget, HolderWidget, TabletopWidget } from './types';

export const DEFAULT_CHILD_WIDTH = 80;
export const DEFAULT_CHILD_HEIGHT = 120;
/** Diagonal offset per card in a `stack` holder. */
export const STACK_OFFSET = 2;
export const FAN_CARD_WIDTH = 80;
export const FAN_PADDING = 16;
export const FAN_MIN_SPREAD = 36;
export const FAN_MIN_TOP = 4;
export const GRID_CELL_WIDTH = 84;
export const GRID_CELL_HEIGHT = 124;
/** Children are drawn this far above their holder. */
export const CHILD_Z_OFFSET = 10;

export interface ChildPosition {
  x: number;
  y: number;
  zIndex: number;
  stackCount?: number;
}

export type HolderLayout = Record<string, ChildPosition>;

/** Hand positions for `childIds` (only cards are placed). */
export function layoutHand(
  holder: HolderWidget,
  childIds: string[],
  widgets: Record<string, TabletopWidget>,
): HolderLayout {
  const cards = childIds.map((id) => widgets[id] as CardWidget).filter(Boolean);
  const layout = calculateHandLayout(holder, cards);
  return Object.fromEntries(
    Object.entries(layout)
      .filter(([id]) => widgets[id]?.type === 'card')
      .map(([id, pos]) => [id, { ...pos, stackCount: pos.stackCount }]),
  );
}

function fanPositions(holder: HolderWidget, widgets: Record<string, TabletopWidget>) {
  const total = holder.childIds.length;
  const maxSpread = FAN_CARD_WIDTH + FAN_PADDING;
  const availableWidth = Math.max(0, holder.width - FAN_CARD_WIDTH - 2 * FAN_PADDING);
  const spread =
    total > 1
      ? Math.min(maxSpread, Math.max(FAN_MIN_SPREAD, availableWidth / (total - 1)))
      : maxSpread;
  const y = holder.y + Math.max(FAN_MIN_TOP, (holder.height - DEFAULT_CHILD_HEIGHT) / 2);
  const layout: HolderLayout = {};
  holder.childIds.forEach((id, idx) => {
    if (!widgets[id]) return;
    layout[id] = {
      x: holder.x + FAN_PADDING + idx * spread,
      y,
      zIndex: holder.zIndex + CHILD_Z_OFFSET + idx,
    };
  });
  return layout;
}

/**
 * Positions after `snappedId` joined `holder` (which already lists it). Hands and fans
 * re-lay all children; stack, grid and unknown layouts place only the snapped widget.
 */
export function layoutHolderChildren(
  holder: HolderWidget,
  widgets: Record<string, TabletopWidget>,
  snappedId: string,
): HolderLayout {
  if (isHandHolder(holder)) return layoutHand(holder, holder.childIds, widgets);
  if (holder.layout === 'fan') return fanPositions(holder, widgets);

  const child = widgets[snappedId];
  const index = holder.childIds.indexOf(snappedId);
  const childW = child?.width || DEFAULT_CHILD_WIDTH;
  const childH = child?.height || DEFAULT_CHILD_HEIGHT;
  let x = holder.x + Math.max(0, Math.round((holder.width - childW) / 2));
  let y = holder.y + Math.max(0, Math.round((holder.height - childH) / 2));
  if (holder.layout === 'stack') {
    x += index * STACK_OFFSET;
    y += index * STACK_OFFSET;
  } else if (holder.layout === 'grid') {
    const cols = Math.floor(holder.width / GRID_CELL_WIDTH);
    x += (index % cols) * GRID_CELL_WIDTH;
    y += Math.floor(index / cols) * GRID_CELL_HEIGHT;
  }
  const zIndex = Math.max(child?.zIndex ?? 0, holder.zIndex + CHILD_Z_OFFSET);
  return { [snappedId]: { x, y, zIndex } };
}

/** Writes `layout` into `widgets` (mutates the map, not the widgets); `parent` is set when given. */
export function applyLayout(
  widgets: Record<string, TabletopWidget>,
  layout: HolderLayout,
  parent?: string,
): void {
  for (const [id, pos] of Object.entries(layout)) {
    const w = widgets[id];
    if (!w) continue;
    widgets[id] = {
      ...w,
      ...(parent ? { parent } : {}),
      x: pos.x,
      y: pos.y,
      zIndex: pos.zIndex,
      ...('stackCount' in pos ? { stackCount: pos.stackCount } : {}),
    };
  }
}
