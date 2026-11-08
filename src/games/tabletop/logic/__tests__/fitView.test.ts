import { describe, expect, it } from 'vitest';
import { contentBounds, fitView } from '../fitView';
import type { TabletopWidget } from '../types';

const w = (id: string, x: number, y: number, extra: Partial<TabletopWidget> = {}) =>
  ({ id, type: 'deck', x, y, width: 100, height: 100, zIndex: 1, ...extra }) as TabletopWidget;
const table = { width: 1400, height: 900 };

describe('contentBounds', () => {
  it('ignores hidden hands, children and seats', () => {
    const box = contentBounds(
      {
        a: w('a', 600, 400, { cardIds: ['inDeck'] } as Partial<TabletopWidget>),
        inDeck: w('inDeck', 0, 0, { type: 'card' }),
        b: w('b', 800, 400),
        hand: w('hand', -99999, -99999, { type: 'holder' }),
        child: w('child', 0, 0, { parent: 'a' }),
        seat: w('seat', 0, 0, { type: 'seat' } as Partial<TabletopWidget>),
      },
      table,
    );
    expect(box).toEqual({ x: 600, y: 400, width: 300, height: 100 });
  });

  it('is null for an empty table', () => {
    expect(contentBounds({}, table)).toBeNull();
  });
});

describe('fitView', () => {
  const phone = { width: 390, height: 500 };

  it('fits the whole table without content', () => {
    const v = fitView(phone, table, null);
    expect(v.scale).toBeCloseTo((390 / 1400) * 0.95);
  });

  it('zooms in on a small cluster, never past 1:1', () => {
    const v = fitView({ width: 300, height: 500 }, table, {
      x: 600,
      y: 400,
      width: 200,
      height: 100,
    });
    expect(v.scale).toBeCloseTo(300 / 360);
    expect(
      fitView({ width: 1000, height: 1000 }, table, { x: 600, y: 400, width: 200, height: 100 })
        .scale,
    ).toBe(1);
  });

  it('keeps the table fit when the pieces cover it', () => {
    const v = fitView(phone, table, { x: 0, y: 0, width: 1400, height: 900 });
    expect(v.scale).toBeCloseTo((390 / 1400) * 0.95);
  });

  it('centres the focus', () => {
    const v = fitView(phone, table, { x: 600, y: 400, width: 200, height: 100 });
    expect(v.x + 700 * v.scale).toBeCloseTo(195, 0);
    expect(v.y + 450 * v.scale).toBeCloseTo(250, 0);
  });
});
