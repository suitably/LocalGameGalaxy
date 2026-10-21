import { describe, it, expect } from 'vitest';
import { NEW_WIDGET_KINDS, createWidget, topZIndex } from '../widgetTemplates';
import type { TabletopGameDefinition } from '../types';

describe('widgetTemplates (#449)', () => {
  it('creates every kind centred on the point', () => {
    for (const kind of NEW_WIDGET_KINDS) {
      const w = createWidget(kind, `w_${kind}`, 500, 400, 7);
      expect(w.id).toBe(`w_${kind}`);
      expect(w.x + w.width / 2).toBeCloseTo(500, 0);
      expect(w.y + w.height / 2).toBeCloseTo(400, 0);
      expect(w.zIndex).toBe(7);
    }
  });

  it('a hand is a seat-owned fan holder, a holder is a public drop target', () => {
    expect(createWidget('hand', 'h', 0, 0, 1)).toMatchObject({
      type: 'holder',
      isHand: true,
      ownerSeat: 0,
      layout: 'fan',
    });
    expect(createWidget('holder', 'p', 0, 0, 1)).toMatchObject({ isHand: false, dropTarget: true });
  });

  it('topZIndex is one above the highest widget', () => {
    const game = {
      widgets: { a: { zIndex: 3 }, b: { zIndex: 9 } },
    } as unknown as TabletopGameDefinition;
    expect(topZIndex(game)).toBe(10);
    expect(topZIndex({ widgets: {} } as unknown as TabletopGameDefinition)).toBe(1);
  });
});
