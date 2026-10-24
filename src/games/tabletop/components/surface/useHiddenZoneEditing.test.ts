import { describe, expect, it } from 'vitest';
import { computeZoneRect } from './useHiddenZoneEditing';

const table = { width: 1000, height: 800 };
const o = { x: 100, y: 100, width: 200, height: 150 };

describe('computeZoneRect', () => {
  it('moves clamped to the table', () => {
    expect(computeZoneRect(table, o, null, -500, 5000)).toMatchObject({ x: 0, y: 650 });
  });
  it('resizes from se', () => {
    expect(computeZoneRect(table, o, 'se', 50, 30)).toEqual({
      x: 100,
      y: 100,
      width: 250,
      height: 180,
    });
  });
  it('keeps opposite edge anchored at min size from nw', () => {
    const r = computeZoneRect(table, o, 'nw', 500, 500);
    expect(r.width).toBe(80);
    expect(r.x + r.width).toBe(300);
    expect(r.y + r.height).toBe(250);
  });
});
