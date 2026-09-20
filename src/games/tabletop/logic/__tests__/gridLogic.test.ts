import { describe, it, expect } from 'vitest';
import { snapToGridCoords } from '../gridLogic';
import type { GridSnapDef } from '../types';

describe('gridLogic - snapToGridCoords', () => {
  const hexGrid: GridSnapDef[] = [
    {
      type: 'hex',
      x: 100,
      y: 100,
      offsetX: 0,
      offsetY: 0,
    },
  ];

  it('snaps coordinates to the nearest grid cell', () => {
    const widget = { width: 50, height: 50 };
    const snapped = snapToGridCoords(widget, 108, 92, hexGrid);
    expect(snapped).not.toBeNull();
    expect(snapped?.x).toBe(100);
    expect(snapped?.y).toBe(100);
  });

  it('respects min and max bounds of the grid', () => {
    const boundedGrid: GridSnapDef[] = [
      {
        type: 'rect',
        x: 50,
        y: 50,
        minX: 100,
        maxX: 500,
        minY: 100,
        maxY: 500,
      },
    ];
    const widget = { width: 40, height: 40 };
    const outOfBounds = snapToGridCoords(widget, 50, 50, boundedGrid);
    expect(outOfBounds).toBeNull();

    const inBounds = snapToGridCoords(widget, 203, 198, boundedGrid);
    expect(inBounds).not.toBeNull();
    expect(inBounds?.x).toBe(200);
    expect(inBounds?.y).toBe(200);
  });
});
