/**
 * Hidden Zone & Fog-of-War Domain Logic [ID: GAME-TABLETOP-HIDDEN-ZONE-LOGIC]
 */
import type { TabletopWidget, HiddenZone, TabletopGameDefinition } from './types';

export const MIN_ZONE_SIZE = 80;

type Rect = { x: number; y: number; width: number; height: number };

/** A widget is locked when pinned or explicitly not movable. */
export function isWidgetLocked(widget: Pick<TabletopWidget, 'pinned' | 'movable'>): boolean {
  return !!widget.pinned || widget.movable === false;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface ZoneMoveResult {
  zone: Pick<HiddenZone, 'x' | 'y'>;
  widgets: Record<string, { x: number; y: number }>;
}

/**
 * Moves a zone by (dx, dy), clamped to the table, together with contained unlocked widgets.
 * Returns null when the zone is unknown or nothing would move.
 */
export function moveZoneWithContents(
  game: Pick<TabletopGameDefinition, 'table' | 'widgets' | 'hiddenZones'>,
  zoneId: string,
  dx: number,
  dy: number,
): ZoneMoveResult | null {
  const zone = game.hiddenZones?.[zoneId];
  if (!zone) return null;
  const x = clamp(zone.x + dx, 0, Math.max(0, game.table.width - zone.width));
  const y = clamp(zone.y + dy, 0, Math.max(0, game.table.height - zone.height));
  const ex = x - zone.x;
  const ey = y - zone.y;
  if (ex === 0 && ey === 0) return null;
  const widgets: ZoneMoveResult['widgets'] = {};
  for (const w of Object.values(game.widgets)) {
    if (isWidgetLocked(w) || !isWidgetInsideZone(w, zone)) continue;
    widgets[w.id] = { x: w.x + ex, y: w.y + ey };
  }
  return { zone: { x, y }, widgets };
}

/** Clamps a requested zone rectangle to the minimum size and the table bounds. */
export function resizeZone(table: { width: number; height: number }, rect: Rect): Rect {
  const width = clamp(rect.width, MIN_ZONE_SIZE, Math.max(MIN_ZONE_SIZE, table.width));
  const height = clamp(rect.height, MIN_ZONE_SIZE, Math.max(MIN_ZONE_SIZE, table.height));
  return {
    width,
    height,
    x: clamp(rect.x, 0, Math.max(0, table.width - width)),
    y: clamp(rect.y, 0, Math.max(0, table.height - height)),
  };
}

/**
 * Checks whether a widget's center point lies within a hidden zone.
 */
export function isWidgetInsideZone(
  widget: { x: number; y: number; width: number; height: number },
  zone: HiddenZone,
): boolean {
  const cx = widget.x + widget.width / 2;
  const cy = widget.y + widget.height / 2;
  return cx >= zone.x && cx <= zone.x + zone.width && cy >= zone.y && cy <= zone.y + zone.height;
}

/**
 * Returns all active hidden zones containing the given widget.
 */
export function findZonesContainingWidget(
  widget: { x: number; y: number; width: number; height: number },
  zones: Record<string, HiddenZone> | undefined,
): HiddenZone[] {
  if (!zones) return [];
  return Object.values(zones).filter((zone) => isWidgetInsideZone(widget, zone));
}

/**
 * Determines whether a widget should be obscured for a specific viewer seat.
 *
 * Rules:
 * 1. Widgets with `showAlways: true` are NEVER obscured.
 * 2. Pinned board-sized tokens (the game board) are NEVER obscured.
 * 3. A zone that is `revealed: true` does not obscure anything.
 * 4. The zone owner (`viewerSeatIndex === zone.ownerSeat`) can see through the zone.
 * 5. Otherwise, if the widget is inside any active non-revealed zone, it is obscured.
 */
export function isWidgetHiddenForViewer(
  widget: TabletopWidget,
  zones: Record<string, HiddenZone> | undefined,
  viewerSeatIndex?: number,
): boolean {
  if (widget.showAlways) return false;
  // Board widget is never hidden
  if (widget.pinned && (widget.width >= 500 || widget.height >= 500)) return false;
  if (!zones || Object.keys(zones).length === 0) return false;

  for (const zone of Object.values(zones)) {
    if (zone.revealed) continue;
    // Owner can see through their own zone
    if (
      zone.ownerSeat !== undefined &&
      viewerSeatIndex !== undefined &&
      zone.ownerSeat === viewerSeatIndex
    ) {
      continue;
    }
    if (isWidgetInsideZone(widget, zone)) {
      return true;
    }
  }

  return false;
}

/**
 * Generates a default hidden zone at an appropriate table coordinate.
 */
export function createDefaultHiddenZone(
  id: string,
  tableWidth: number,
  tableHeight: number,
  options?: {
    ownerSeat?: number;
    color?: string;
    label?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  },
): HiddenZone {
  const defaultW = Math.min(500, Math.round(tableWidth * 0.3));
  const defaultH = Math.min(350, Math.round(tableHeight * 0.3));

  return {
    id,
    x: options?.x ?? Math.round((tableWidth - defaultW) / 2),
    y: options?.y ?? Math.round((tableHeight - defaultH) / 2),
    width: options?.width ?? defaultW,
    height: options?.height ?? defaultH,
    color: options?.color || '#212121',
    ownerSeat: options?.ownerSeat,
    revealed: false,
    label:
      options?.label ||
      (options?.ownerSeat !== undefined
        ? `Verdeckt (Spieler ${options.ownerSeat + 1})`
        : 'Verdeckter Bereich'),
  };
}
