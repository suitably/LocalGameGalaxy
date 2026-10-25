import { describe, expect, it, vi } from 'vitest';
import { dealFromSource, tapSource, type SourceCallbacks } from '../sourcePress';
import type {
  BagWidget,
  CardWidget,
  DeckWidget,
  HolderWidget,
  TabletopWidget,
} from '../../logic/types';

const base = { width: 50, height: 50, zIndex: 1 };
const deck = (extra: Partial<DeckWidget> = {}): DeckWidget =>
  ({ ...base, id: 'd', type: 'deck', x: 10, y: 20, cardIds: ['a', 'b'], ...extra }) as DeckWidget;
const hand = {
  ...base,
  id: 'h',
  type: 'holder',
  x: 0,
  y: 0,
  childIds: [],
} as unknown as HolderWidget;
const template = { ...base, id: 't', type: 'card', x: 0, y: 0 } as CardWidget;

const callbacks = (widgets: Record<string, TabletopWidget>, handHolderId?: string) => {
  const cb = {
    widgets,
    handHolderId,
    onSnapToHolder: vi.fn(),
    onDrawCardAt: vi.fn(),
    onDrawFromBag: vi.fn(),
  } satisfies SourceCallbacks;
  return cb;
};

describe('dealFromSource', () => {
  it('drags the top card off a closed deck face down', () => {
    const cb = callbacks({});
    expect(dealFromSource(cb, deck())).toBe('b');
    expect(cb.onDrawCardAt).toHaveBeenCalledWith('d', 10, 20, 'b', false);
  });

  it('keeps cards from an open pile face up', () => {
    const cb = callbacks({});
    dealFromSource(cb, deck({ faceUp: true }));
    expect(cb.onDrawCardAt).toHaveBeenCalledWith('d', 10, 20, 'b', true);
  });

  it('takes a clone from an infinite bag instead of moving the bag', () => {
    const cb = callbacks({});
    const bag = {
      ...base,
      id: 'bag',
      type: 'bag',
      x: 5,
      y: 6,
      isInfinite: true,
      templateWidget: template,
    } as BagWidget;
    const id = dealFromSource(cb, bag);
    expect(id).toMatch(/^tok_/);
    expect(cb.onDrawFromBag).toHaveBeenCalledWith('bag', { x: 5, y: 6 }, id);
  });
});

describe('tapSource', () => {
  it('deals the top card into the viewer hand', () => {
    const cb = callbacks({ h: hand }, 'h');
    tapSource(cb, deck());
    expect(cb.onDrawCardAt).toHaveBeenCalledWith('d', 10, 20, 'b');
    expect(cb.onSnapToHolder).toHaveBeenCalledWith('b', 'h');
  });

  it('does nothing on a deck without a hand (spectator)', () => {
    const cb = callbacks({});
    tapSource(cb, deck());
    expect(cb.onDrawCardAt).not.toHaveBeenCalled();
  });

  it('places a bag item next to the bag', () => {
    const cb = callbacks({});
    tapSource(cb, { ...base, id: 'bag', type: 'bag', x: 0, y: 0, itemIds: ['x'] } as BagWidget);
    expect(cb.onDrawFromBag).toHaveBeenCalledWith('bag');
  });
});
