import { describe, expect, it } from 'vitest';
import { dealActions } from '../dealCards';
import type { TabletopWidget } from '../types';

const base = { x: 0, y: 0, width: 80, height: 120, zIndex: 1 };
const hand = (id: string, ownerSeat: number) =>
  ({
    ...base,
    id,
    type: 'holder',
    isHand: true,
    ownerSeat,
    childIds: [],
    dropTargetTypes: ['card'],
    layout: 'fan',
  }) as unknown as TabletopWidget;
const deck = (cards: number) =>
  ({
    ...base,
    id: 'deck',
    type: 'deck',
    cardIds: Array.from({ length: cards }, (_, i) => `c${i}`),
    backContent: { type: 'color', value: '#000' },
  }) as unknown as TabletopWidget;
const widgets = (cards: number) =>
  Object.fromEntries([hand('h2', 1), hand('h1', 0), deck(cards)].map((w) => [w.id, w]));

describe('dealActions', () => {
  it('deals round robin in seat order', () => {
    const targets = dealActions(widgets(10), 'deck', 2).map(
      (a) => (a as { payload: { targetHolderId: string } }).payload.targetHolderId,
    );
    expect(targets).toEqual(['h1', 'h2', 'h1', 'h2']);
  });

  it('stops when the deck runs out', () => {
    expect(dealActions(widgets(3), 'deck', 5)).toHaveLength(3);
  });

  it('ignores anything that is not a deck', () => {
    expect(dealActions(widgets(3), 'h1')).toEqual([]);
  });
});
