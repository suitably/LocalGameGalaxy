/**
 * Hidden Zone & Fog-of-War Domain Logic [ID: GAME-TABLETOP-HIDDEN-ZONE-LOGIC]
 */
import type { TabletopWidget, HiddenZone } from './types';

/**
 * Checks whether a widget's center point lies within a hidden zone.
 */
export function isWidgetInsideZone(
  widget: { x: number; y: number; width: number; height: number },
  zone: HiddenZone,
): boolean {
  const cx = widget.x + widget.width / 2;
  const cy = widget.y + widget.height / 2;
  return (
    cx >= zone.x &&
    cx <= zone.x + zone.width &&
    cy >= zone.y &&
    cy <= zone.y + zone.height
  );
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
    if (zone.ownerSeat !== undefined && viewerSeatIndex !== undefined && zone.ownerSeat === viewerSeatIndex) {
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
    label: options?.label || (options?.ownerSeat !== undefined ? `Verdeckt (Spieler ${options.ownerSeat + 1})` : 'Verdeckter Bereich'),
  };
}
