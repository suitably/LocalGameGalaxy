/**
 * A player's own area on the table: their hidden zones and the hand holders they own that lie
 * on the table [ID: LOGIC-TABLETOP-MY-AREA]
 *
 * The phone's "My area" view zooms to it, so a player finds their secret tiles or cup without
 * searching the whole table.
 */
import type { Box, ViewTransform } from './fitView';
import type { HiddenZone, HolderWidget, TabletopWidget } from './types';

const AREA_MARGIN = 40;
/** A small zone may be enlarged, but not beyond twice its natural size. */
const MAX_AREA_SCALE = 2;

/** Bounding box of everything `seat` owns on the table, or null when it owns nothing there. */
export function myAreaBounds(
  game: {
    table: { width: number; height: number };
    widgets: Record<string, TabletopWidget>;
    hiddenZones?: Record<string, HiddenZone>;
  },
  seat: number | null,
): Box | null {
  if (seat === null) return null;
  const { width, height } = game.table;
  const onTable = (b: Box) =>
    b.x + b.width > 0 && b.y + b.height > 0 && b.x < width && b.y < height;
  const zones = Object.values(game.hiddenZones ?? {}).filter((z) => z.ownerSeat === seat);
  const hands = Object.values(game.widgets).filter(
    (w): w is HolderWidget =>
      w.type === 'holder' && Boolean((w as HolderWidget).isHand) && w.ownerSeat === seat,
  );
  const boxes: Box[] = [...zones, ...hands].filter(onTable);
  if (boxes.length === 0) return null;
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Transform that centres `area` in the container, as large as fits (at most twice its size). */
export function focusView(container: { width: number; height: number }, area: Box): ViewTransform {
  const padded = {
    x: area.x - AREA_MARGIN,
    y: area.y - AREA_MARGIN,
    width: area.width + 2 * AREA_MARGIN,
    height: area.height + 2 * AREA_MARGIN,
  };
  const scale = Math.min(
    container.width / padded.width,
    container.height / padded.height,
    MAX_AREA_SCALE,
  );
  return {
    x: Math.round(container.width / 2 - (padded.x + padded.width / 2) * scale),
    y: Math.round(container.height / 2 - (padded.y + padded.height / 2) * scale),
    scale,
  };
}
