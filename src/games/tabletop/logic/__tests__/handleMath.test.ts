import { describe, it, expect } from 'vitest';
import { MIN_WIDGET_SIZE, resizeBy, rotationFromPointer } from '../handleMath';

describe('handleMath (#449)', () => {
  it('resizes freely, never below the minimum', () => {
    expect(resizeBy({ width: 80, height: 120 }, 20, -10, false)).toEqual({
      width: 100,
      height: 110,
    });
    expect(resizeBy({ width: 80, height: 120 }, -500, -500, false)).toEqual({
      width: MIN_WIDGET_SIZE,
      height: MIN_WIDGET_SIZE,
    });
  });

  it('keeps the aspect ratio when asked', () => {
    expect(resizeBy({ width: 80, height: 120 }, 80, 0, true)).toEqual({ width: 160, height: 240 });
  });

  it('measures rotation clockwise from straight up and snaps to 15°', () => {
    const c = { x: 0, y: 0 };
    expect(rotationFromPointer(c, { x: 0, y: -10 }, false)).toBe(0);
    expect(rotationFromPointer(c, { x: 10, y: 0 }, false)).toBe(90);
    expect(rotationFromPointer(c, { x: 0, y: 10 }, false)).toBe(180);
    expect(rotationFromPointer(c, { x: -10, y: 0 }, false)).toBe(270);
    expect(rotationFromPointer(c, { x: 10, y: -9 }, true)).toBe(45);
  });
});
