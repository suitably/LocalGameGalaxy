/**
 * Hidden Zone & Fog-of-War Domain Logic [ID: GAME-TABLETOP-HIDDEN-ZONE-LOGIC]
 */
import type { TabletopWidget, HiddenZone, TabletopGameDefinition } from './types';
import { resizeBy } from './handleMath';

export const DEFAULT_ZONE_COLOR = '#212121';

export type ZoneRect = Pick<HiddenZone, 'x' | 'y' | 'width' | 'height'>;

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
    color: options?.color || DEFAULT_ZONE_COLOR,
    ownerSeat: options?.ownerSeat,
    revealed: false,
    label:
      options?.label ||
      (options?.ownerSeat !== undefined
        ? `Verdeckt (Spieler ${options.ownerSeat + 1})`
        : 'Verdeckter Bereich'),
  };
}

/** Locked widgets stay where they are when a hidden zone around them moves. */
export function isWidgetLocked(widget: TabletopWidget): boolean {
  return Boolean(widget.pinned) || widget.movable === false;
}

/** Board widgets the viewer may see; widgets inside someone else's hidden zone are left out. */
export function filterVisibleForViewer<W extends TabletopWidget>(
  widgets: W[],
  zones: Record<string, HiddenZone> | undefined,
  viewerSeatIndex?: number,
): W[] {
  if (!zones || Object.keys(zones).length === 0) return widgets;
  return widgets.filter((w) => !isWidgetHiddenForViewer(w, zones, viewerSeatIndex));
}

/** Zone rectangle while dragging its body (`move`) or bottom-right handle (`resize`). */
export function dragZoneRect(
  start: ZoneRect,
  dx: number,
  dy: number,
  mode: 'move' | 'resize',
): ZoneRect {
  if (mode === 'resize') return { x: start.x, y: start.y, ...resizeBy(start, dx, dy, false) };
  return {
    x: Math.round(start.x + dx),
    y: Math.round(start.y + dy),
    width: start.width,
    height: start.height,
  };
}

/** Keeps a zone rectangle on the table. */
export function clampZoneRect(rect: ZoneRect, tableWidth: number, tableHeight: number): ZoneRect {
  const width = Math.min(rect.width, tableWidth);
  const height = Math.min(rect.height, tableHeight);
  return {
    x: Math.min(Math.max(0, rect.x), tableWidth - width),
    y: Math.min(Math.max(0, rect.y), tableHeight - height),
    width,
    height,
  };
}

/**
 * Moves and/or resizes a hidden zone. Unlocked widgets inside the zone (before the change) are
 * shifted by the same offset, so moving the zone carries its contents along. Returns `game`
 * unchanged when the zone does not exist or nothing changed.
 */
export function setZoneRectWithContents(
  game: TabletopGameDefinition,
  zoneId: string,
  rect: ZoneRect,
): TabletopGameDefinition {
  const zone = game.hiddenZones?.[zoneId];
  if (!zone) return game;
  const next = clampZoneRect(rect, game.table.width, game.table.height);
  if (
    next.x === zone.x &&
    next.y === zone.y &&
    next.width === zone.width &&
    next.height === zone.height
  ) {
    return game;
  }

  const dx = next.x - zone.x;
  const dy = next.y - zone.y;
  let widgets = game.widgets;
  if (dx !== 0 || dy !== 0) {
    widgets = { ...game.widgets };
    for (const w of Object.values(game.widgets)) {
      if (isWidgetLocked(w) || !isWidgetInsideZone(w, zone)) continue;
      widgets[w.id] = { ...w, x: w.x + dx, y: w.y + dy };
    }
  }

  return {
    ...game,
    widgets,
    hiddenZones: { ...game.hiddenZones, [zoneId]: { ...zone, ...next } },
  };
}
