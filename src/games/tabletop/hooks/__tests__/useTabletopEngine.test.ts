import { describe, it, expect } from 'vitest';
import { snapToGridCoords, type GridSnapDef } from '../useTabletopEngine';

describe('snapToGridCoords', () => {
  it('snaps coordinates to closest hex grid point', () => {
    const gridDef: GridSnapDef[] = [
      {
        x: 173.205,
        y: 300,
        offsetX: -24.42,
        offsetY: 5,
      },
    ];

    const widget = { width: 90, height: 90 };
    // Exact snap coordinate or near it
    const snapped = snapToGridCoords(widget, 750, 450, gridDef);
    expect(snapped).not.toBeNull();
    expect(snapped?.x).toBeDefined();
    expect(snapped?.y).toBeDefined();
    // Snapped point should be within half grid distance
    expect(Math.abs((snapped?.x || 0) - 750)).toBeLessThan(173.2);
    expect(Math.abs((snapped?.y || 0) - 450)).toBeLessThan(300);
  });

  it('respects minX, maxX, minY, maxY boundaries', () => {
    const gridDef: GridSnapDef[] = [
      {
        x: 100,
        y: 100,
        minX: 500,
      },
    ];

    const widget = { width: 40, height: 40 };
    // x = 200 is below minX = 500, so it shouldn't match
    const snapped = snapToGridCoords(widget, 200, 200, gridDef);
    expect(snapped).toBeNull();

    // x = 600 is above minX = 500, so it should match
    const snappedValid = snapToGridCoords(widget, 600, 200, gridDef);
    expect(snappedValid).not.toBeNull();
  });
});
