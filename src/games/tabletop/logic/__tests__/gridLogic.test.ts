import { describe, it, expect } from 'vitest';
import checkers from '../../../../../public/games/tabletop/checkers.json';
import { snapDropPosition, snapToGridCoords, snapToTableGrid } from '../gridLogic';
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

describe('gridLogic - table grid snap (#700)', () => {
  const token = { width: 70, height: 70 };

  it('snapToTableGrid rounds to the nearest multiple', () => {
    expect(snapToTableGrid(123, 38, 50)).toEqual({ x: 100, y: 50 });
    expect(snapToTableGrid(125, 25, 50)).toEqual({ x: 150, y: 50 });
  });

  it('snapToTableGrid leaves positions untouched when the grid is off', () => {
    for (const size of [undefined, 0, -10, Number.NaN]) {
      expect(snapToTableGrid(123, 38, size)).toEqual({ x: 123, y: 38 });
    }
  });

  it('snapDropPosition returns null without any grid', () => {
    expect(snapDropPosition(token, 123, 38)).toBeNull();
    expect(snapDropPosition(token, 123, 38, 0)).toBeNull();
  });

  it('snapDropPosition uses the table grid for widgets without their own', () => {
    expect(snapDropPosition(token, 123, 38, 50)).toEqual({ x: 100, y: 50 });
  });

  it('a widget grid wins over the table grid: checkers piece lands on a square centre', () => {
    const widgets = (
      Array.isArray(checkers.widgets) ? checkers.widgets : Object.values(checkers.widgets)
    ) as Array<{
      type: string;
      width: number;
      height: number;
      grid?: GridSnapDef[];
    }>;
    const piece = widgets.find((w) => w.type === 'token' && w.grid)!;
    const snapped = snapDropPosition(piece, 233, 171, checkers.table.gridSnap)!;
    // Squares are 100 px starting at 50: centres at 100, 200, 300 ...
    expect((snapped.x + piece.width / 2 - 50) % 100).toBe(50);
    expect((snapped.y + piece.height / 2 - 50) % 100).toBe(50);
  });
});
