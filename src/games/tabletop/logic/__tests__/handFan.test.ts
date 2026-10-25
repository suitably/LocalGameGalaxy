import { describe, expect, it } from 'vitest';
import { fanLayout, handSlots } from '../handFan';
import type { CardWidget } from '../types';
import { groupHandCards } from '../handLayout';

const card = (id: string, cardType?: string): CardWidget =>
  ({
    id,
    type: 'card',
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    zIndex: 1,
    cardType,
    frontContent: { type: 'text', value: id },
    backContent: { type: 'text', value: '' },
  }) as CardWidget;

describe('fanLayout', () => {
  it('returns nothing for an empty hand', () => {
    expect(fanLayout(0, 300, 72)).toEqual({ slots: [], width: 0, step: 0, overflow: false });
  });

  it('lays out a few cards side by side without overlap when they fit', () => {
    const fan = fanLayout(3, 600, 72);
    expect(fan.step).toBe(78);
    expect(fan.slots.map((s) => s.rotate)).toEqual([0, 0, 0]);
    expect(fan.overflow).toBe(false);
  });

  it('overlaps cards to fit a phone-width dock', () => {
    const fan = fanLayout(10, 340, 72);
    expect(fan.width).toBeLessThanOrEqual(340);
    expect(fan.step).toBeLessThan(72);
    expect(fan.overflow).toBe(false);
    // Arc: outer cards tilt outwards and sit lower than the middle.
    expect(fan.slots[0].rotate).toBeLessThan(0);
    expect(fan.slots[9].rotate).toBeGreaterThan(0);
    expect(fan.slots[0].drop).toBeGreaterThan(fan.slots[4].drop);
  });

  it('keeps a minimum visible strip and reports overflow for huge hands', () => {
    const fan = fanLayout(40, 340, 72, { minStep: 22 });
    expect(fan.step).toBe(22);
    expect(fan.overflow).toBe(true);
  });
});

describe('handSlots', () => {
  it('stacks identical resource cards and keeps action cards apart', () => {
    const groups = groupHandCards([
      card('w1', 'wood'),
      card('w2', 'wood'),
      card('k1', 'knight'),
      card('k2', 'knight'),
    ]);
    const slots = handSlots(groups);
    expect(slots.map((s) => [s.card.id, s.count])).toEqual([
      ['w2', 2],
      ['k1', 1],
      ['k2', 1],
    ]);
  });
});
