/**
 * Initial table view: fit the table, zoomed in on the pieces when they cover only a small
 * part of it [ID: LOGIC-TABLETOP-FIT-VIEW]
 *
 * A 52-card deck in the middle of a 1400 px table would otherwise be a few pixels wide on a
 * phone. The zoom never goes past 1:1 and always keeps all pieces in view.
 */
import type { DeckWidget, TabletopWidget } from './types';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const CONTENT_MARGIN = 80;
const MAX_CONTENT_SCALE = 1;

/** Bounding box of the widgets lying on the table (not in decks, holders' parents or off it). */
export function contentBounds(
  widgets: Record<string, TabletopWidget>,
  table: { width: number; height: number },
): Box | null {
  // Cards inside a deck are drawn as the deck, wherever their own coordinates say.
  const inDeck = new Set(
    Object.values(widgets).flatMap((w) => (w.type === 'deck' ? (w as DeckWidget).cardIds : [])),
  );
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const w of Object.values(widgets)) {
    if (w.parent || inDeck.has(w.id) || w.type === 'seat' || w.width <= 0 || w.height <= 0)
      continue;
    if (w.x + w.width <= 0 || w.y + w.height <= 0 || w.x >= table.width || w.y >= table.height)
      continue;
    minX = Math.min(minX, w.x);
    minY = Math.min(minY, w.y);
    maxX = Math.max(maxX, w.x + w.width);
    maxY = Math.max(maxY, w.y + w.height);
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Transform for a container: the whole table, or closer on the pieces when that is larger. */
export function fitView(
  container: { width: number; height: number },
  table: { width: number; height: number },
  content: Box | null,
): ViewTransform {
  const tableScale =
    Math.min(container.width / table.width, container.height / table.height) * 0.95;
  let focus: Box = { x: 0, y: 0, width: table.width, height: table.height };
  let scale = tableScale;
  if (content) {
    const padded = {
      x: content.x - CONTENT_MARGIN,
      y: content.y - CONTENT_MARGIN,
      width: content.width + 2 * CONTENT_MARGIN,
      height: content.height + 2 * CONTENT_MARGIN,
    };
    const contentScale = Math.min(container.width / padded.width, container.height / padded.height);
    const closer = Math.min(contentScale, MAX_CONTENT_SCALE);
    if (closer > tableScale) {
      scale = closer;
      focus = padded;
    }
  }
  return {
    x: Math.round(container.width / 2 - (focus.x + focus.width / 2) * scale),
    y: Math.round(container.height / 2 - (focus.y + focus.height / 2) * scale),
    scale,
  };
}
