/**
 * Tabletop Grid Snapping Logic [ID: LOGIC-TABLETOP-GRID]
 */
import type { GridSnapDef } from './types';

function gridMod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/**
 * Snaps coordinates (x, y) for a widget of size (width, height) to the closest grid node in gridArray.
 */
export function snapToGridCoords(
  widget: { width: number; height: number },
  x: number,
  y: number,
  gridArray: GridSnapDef[],
): { x: number; y: number } | null {
  let closest: { x: number; y: number } | null = null;
  let closestDistance = 999999;

  for (const grid of gridArray) {
    if (!grid || typeof grid.x !== 'number' || typeof grid.y !== 'number' || grid.x <= 0 || grid.y <= 0) continue;
    const alignX = (grid.alignX || 0) * widget.width;
    const alignY = (grid.alignY || 0) * widget.height;
    if (x < (grid.minX || -99999) || x > (grid.maxX || 99999) || y < (grid.minY || -99999) || y > (grid.maxY || 99999)) continue;

    const snapX = x + alignX + grid.x / 2 - gridMod(x + alignX + grid.x / 2 - (grid.offsetX || 0), grid.x);
    const snapY = y + alignY + grid.y / 2 - gridMod(y + alignY + grid.y / 2 - (grid.offsetY || 0), grid.y);
    const distance = (snapX - x) ** 2 + (snapY - y) ** 2;

    if (distance < closestDistance) {
      closest = { x: Math.round(snapX - alignX), y: Math.round(snapY - alignY) };
      closestDistance = distance;
    }
  }

  return closest;
}
