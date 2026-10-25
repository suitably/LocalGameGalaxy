import { describe, expect, it } from 'vitest';
import {
  createShakeTracker,
  deckShowsFront,
  nextSourceItemId,
  shakeActionFor,
  sourceKind,
  tableKeyAction,
} from '../tableGestures';
import type { BagWidget, CardWidget, DeckWidget, DieWidget, TabletopWidget } from '../types';

const base = { x: 0, y: 0, width: 50, height: 50, zIndex: 1 };
const deck = (cardIds: string[], extra: Partial<DeckWidget> = {}): DeckWidget =>
  ({ ...base, id: 'd', type: 'deck', cardIds, ...extra }) as DeckWidget;
const die: DieWidget = { ...base, id: 'die', type: 'die', currentValue: 1, sides: 6 };
const card = { ...base, id: 'c', type: 'card' } as CardWidget;
const bag = (extra: Partial<BagWidget>): BagWidget =>
  ({ ...base, id: 'b', type: 'bag', ...extra }) as BagWidget;

describe('sourceKind', () => {
  it('deals from decks with cards and non-empty or infinite bags', () => {
    expect(sourceKind(deck(['a']), true)).toBe('deck');
    expect(sourceKind(deck([]), true)).toBeNull();
    expect(sourceKind(bag({ itemIds: ['x'] }), true)).toBe('bag');
    expect(sourceKind(bag({ itemIds: [] }), true)).toBeNull();
    expect(sourceKind(bag({ isInfinite: true, templateWidget: card }), true)).toBe('bag');
  });

  it('never deals for spectators', () => {
    expect(sourceKind(deck(['a']), false)).toBeNull();
    expect(sourceKind(bag({ isInfinite: true, templateWidget: card }), false)).toBeNull();
  });

  it('ignores other widgets', () => {
    expect(sourceKind(die, true)).toBeNull();
  });
});

describe('nextSourceItemId', () => {
  it('takes the top card, the last bag item or a fresh clone id', () => {
    expect(nextSourceItemId(deck(['a', 'b']))).toBe('b');
    expect(nextSourceItemId(bag({ itemIds: ['x', 'y'] }))).toBe('y');
    expect(nextSourceItemId(bag({ isInfinite: true, templateWidget: card }), () => 'new')).toBe(
      'new',
    );
    expect(nextSourceItemId(die)).toBeNull();
  });
});

describe('deckShowsFront', () => {
  it('keeps cards from an open pile face up, from a closed deck face down', () => {
    expect(deckShowsFront(deck(['a']))).toBe(false);
    expect(deckShowsFront(deck(['a'], { faceUp: true }))).toBe(true);
    expect(deckShowsFront(deck(['a'], { activeFace: 1 }))).toBe(true);
  });
});

describe('shakeActionFor', () => {
  it('shuffles decks and rolls dice with the same action', () => {
    expect(shakeActionFor(deck(['a', 'b']))).toEqual({
      type: 'SHUFFLE_DECK',
      payload: { deckId: 'd' },
    });
    expect(shakeActionFor(die)).toEqual({ type: 'ROLL_DIE', payload: { dieId: 'die' } });
  });

  it('does nothing for single-card decks, bags and cards', () => {
    expect(shakeActionFor(deck(['a']))).toBeNull();
    expect(shakeActionFor(bag({ isInfinite: true }))).toBeNull();
    expect(shakeActionFor(card)).toBeNull();
    expect(shakeActionFor(undefined)).toBeNull();
  });
});

describe('tableKeyAction', () => {
  it('maps F to flip and S to shake', () => {
    expect(tableKeyAction('f', card)).toEqual({ type: 'FLIP_CARD', payload: { cardId: 'c' } });
    expect(tableKeyAction('S', die)).toEqual({ type: 'ROLL_DIE', payload: { dieId: 'die' } });
    expect(tableKeyAction('f', die)).toBeNull();
  });

  it('leaves modifier chords alone', () => {
    expect(tableKeyAction('s', deck(['a', 'b']), { ctrlKey: true })).toBeNull();
    expect(tableKeyAction('f', card as TabletopWidget, { metaKey: true })).toBeNull();
  });
});

describe('createShakeTracker', () => {
  it('detects quick back-and-forth motion', () => {
    const tracker = createShakeTracker();
    const xs = [0, 30, 0, 30, 0, 30];
    const hits = xs.map((x, i) => tracker.push(x, 0, i * 80));
    expect(hits).toContain(true);
  });

  it('ignores a straight drag and slow wiggles', () => {
    const straight = createShakeTracker();
    expect([0, 30, 60, 90, 120].some((x, i) => straight.push(x, 0, i * 50))).toBe(false);
    const slow = createShakeTracker();
    expect([0, 30, 0, 30, 0, 30].some((x, i) => slow.push(x, 0, i * 600))).toBe(false);
  });

  it('ignores jitter below the travel threshold', () => {
    const tracker = createShakeTracker();
    expect([0, 5, 0, 5, 0, 5, 0, 5].some((x, i) => tracker.push(x, 0, i * 40))).toBe(false);
  });
});
