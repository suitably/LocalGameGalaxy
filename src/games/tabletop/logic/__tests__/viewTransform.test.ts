import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, MIN_ZOOM, panBy, pinchView, wheelZoomFactor, zoomAt } from '../viewTransform';

const boardPointAt = (v: { x: number; y: number; scale: number }, p: { x: number; y: number }) => ({
  x: (p.x - v.x) / v.scale,
  y: (p.y - v.y) / v.scale,
});

describe('zoomAt', () => {
  it('keeps the board point under the anchor', () => {
    const view = { x: 40, y: -25, scale: 0.8 };
    const anchor = { x: 300, y: 220 };
    const next = zoomAt(view, anchor, 1.6);
    expect(next.scale).toBe(1.6);
    const before = boardPointAt(view, anchor);
    const after = boardPointAt(next, anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps the scale and still keeps the anchor', () => {
    const view = { x: 10, y: 10, scale: 1 };
    const anchor = { x: 100, y: 50 };
    const far = zoomAt(view, anchor, 50);
    expect(far.scale).toBe(MAX_ZOOM);
    expect(boardPointAt(far, anchor).x).toBeCloseTo(boardPointAt(view, anchor).x);
    expect(zoomAt(view, anchor, 0.0001).scale).toBe(MIN_ZOOM);
  });

  it('does not move the view at the zoom limit', () => {
    const view = { x: 10, y: 20, scale: MAX_ZOOM };
    expect(zoomAt(view, { x: 200, y: 200 }, MAX_ZOOM * 2)).toEqual(view);
  });
});

describe('panBy', () => {
  it('moves the view by the pointer delta', () => {
    expect(panBy({ x: 5, y: 5, scale: 2 }, { x: 10, y: 10 }, { x: 25, y: 4 })).toEqual({
      x: 20,
      y: -1,
      scale: 2,
    });
  });
});

describe('pinchView', () => {
  const base = { x: 0, y: 0, scale: 1 };

  it('zooms around the point between the fingers, not the table corner', () => {
    const next = pinchView(
      base,
      { x: 200, y: 300 },
      { x: 400, y: 300 },
      { x: 100, y: 300 },
      { x: 500, y: 300 },
    );
    expect(next.scale).toBe(2);
    // board point (300, 300) was between the fingers and still is
    expect(next.x + 300 * next.scale).toBeCloseTo(300);
    expect(next.y + 300 * next.scale).toBeCloseTo(300);
  });

  it('pans when both fingers move together', () => {
    const next = pinchView(
      base,
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 130, y: 160 },
      { x: 230, y: 160 },
    );
    expect(next).toEqual({ x: 30, y: 60, scale: 1 });
  });

  it('keeps each finger on its board point while zooming and panning', () => {
    const start = { x: 12, y: -7, scale: 0.5 };
    const a0 = { x: 100, y: 200 };
    const b0 = { x: 300, y: 200 };
    const a1 = { x: 80, y: 260 };
    const b1 = { x: 380, y: 260 };
    const next = pinchView(start, a0, b0, a1, b1);
    expect(boardPointAt(next, a1).x).toBeCloseTo(boardPointAt(start, a0).x);
    expect(boardPointAt(next, b1).x).toBeCloseTo(boardPointAt(start, b0).x);
    expect(boardPointAt(next, a1).y).toBeCloseTo(boardPointAt(start, a0).y);
  });

  it('ignores a degenerate start distance', () => {
    const p = { x: 50, y: 50 };
    expect(pinchView(base, p, p, p, p)).toEqual(base);
  });
});

describe('wheelZoomFactor', () => {
  it('zooms in on wheel up and out on wheel down', () => {
    expect(wheelZoomFactor(-100, 0, false)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100, 0, false)).toBeLessThan(1);
  });

  it('reacts more strongly to a trackpad pinch and limits one step', () => {
    expect(wheelZoomFactor(-10, 0, true)).toBeGreaterThan(wheelZoomFactor(-10, 0, false));
    expect(wheelZoomFactor(-5000, 0, false)).toBe(wheelZoomFactor(-200, 0, false));
    expect(wheelZoomFactor(-3, 1, false)).toBe(wheelZoomFactor(-48, 0, false));
  });
});
