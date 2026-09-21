import { describe, it, expect } from 'vitest';
import { calculateHandLayout, isActionCard, isCardInHand } from '../handLayout';
import type { CardWidget, HolderWidget } from '../types';

describe('handLayout', () => {
  const dummyHolder: HolderWidget = {
    id: 'Hand',
    type: 'holder',
    x: 100,
    y: 800,
    width: 900,
    height: 140,
    zIndex: 10,
    dropTargetTypes: ['card'],
    childIds: [],
    layout: 'fan',
    isHand: true,
  };

  const createCard = (id: string, cardType?: string, deckId?: string): CardWidget => ({
    id,
    type: 'card',
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    zIndex: 100,
    rotation: 0,
    faceUp: true,
    cardType,
    deckId,
    frontContent: { type: 'text', value: id },
    backContent: { type: 'text', value: 'back' },
  });

  it('identifies action cards correctly', () => {
    expect(isActionCard(createCard('c1', 'Knight', 'Development'))).toBe(true);
    expect(isActionCard(createCard('c2', '1 Point', 'Development'))).toBe(true);
    expect(isActionCard(createCard('c3', 'Wood', 'Resources'))).toBe(false);
  });

  it('stacks identical resource cards and sets stackCount on top card', () => {
    const cards = [
      createCard('w1', 'Wood', 'Resources'),
      createCard('w2', 'Wood', 'Resources'),
      createCard('w3', 'Wood', 'Resources'),
    ];
    const layout = calculateHandLayout(dummyHolder, cards);

    expect(layout['w1'].stackCount).toBeUndefined();
    expect(layout['w2'].stackCount).toBeUndefined();
    expect(layout['w3'].stackCount).toBe(3);

    // Bottom cards have lower zIndex than top
    expect(layout['w1'].zIndex).toBeLessThan(layout['w2'].zIndex);
    expect(layout['w2'].zIndex).toBeLessThan(layout['w3'].zIndex);
  });

  it('cascades action cards without hiding them and leaves stackCount undefined', () => {
    const cards = [
      createCard('k1', 'Knight', 'Development'),
      createCard('k2', 'Knight', 'Development'),
    ];
    const layout = calculateHandLayout(dummyHolder, cards);

    expect(layout['k1'].stackCount).toBeUndefined();
    expect(layout['k2'].stackCount).toBeUndefined();
    // Offset by 28px horizontally
    expect(layout['k2'].x - layout['k1'].x).toBe(28);
  });

  it('maintains generous gap between distinct card groups', () => {
    const cards = [
      createCard('w1', 'Wood', 'Resources'),
      createCard('b1', 'Bricks', 'Resources'),
    ];
    const layout = calculateHandLayout(dummyHolder, cards);

    // Distance between start of Wood and start of Bricks should be at least card width (80) + gap (>= 36)
    const distance = layout['b1'].x - layout['w1'].x;
    expect(distance).toBeGreaterThanOrEqual(116);
  });

  it('determines if card is in hand using isCardInHand', () => {
    const widgets = {
      Hand: {
        id: 'Hand',
        type: 'holder',
        childIds: ['c1', 'c2'],
        isHand: true,
      },
      OtherHolder: {
        id: 'Wood',
        type: 'holder',
        childIds: ['c3'],
      },
      c1: { id: 'c1', type: 'card' },
      c2: { id: 'c2', type: 'card' },
      c3: { id: 'c3', type: 'card' },
      c4: { id: 'c4', type: 'card' },
    };

    expect(isCardInHand('c1', widgets)).toBe(true);
    expect(isCardInHand('c2', widgets)).toBe(true);
    expect(isCardInHand('c3', widgets)).toBe(false);
    expect(isCardInHand('c4', widgets)).toBe(false);
  });
});
