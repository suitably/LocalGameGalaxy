import { describe, it, expect } from 'vitest';
import { SKAT_RANKS, cardText, createDeck, isRed, shuffledDeck } from './deck';

describe('playing-cards deck', () => {
  it('builds 52 unique cards by default', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(deck.some((c) => c.rank === 'JOKER')).toBe(false);
  });

  it('adds jokers with no suit after the suited cards', () => {
    const deck = createDeck({ jokers: 2 });
    expect(deck).toHaveLength(54);
    expect(deck.slice(-2)).toEqual([
      { id: 52, rank: 'JOKER', suit: null },
      { id: 53, rank: 'JOKER', suit: null },
    ]);
  });

  it('builds the 32-card Skat deck', () => {
    const deck = createDeck({ ranks: SKAT_RANKS });
    expect(deck).toHaveLength(32);
    expect(deck.filter((c) => c.suit === 'hearts').map((c) => c.rank)).toEqual([...SKAT_RANKS]);
  });

  it('shuffles without losing cards', () => {
    const ids = shuffledDeck({ jokers: 1 })
      .map((c) => c.id)
      .sort((a, b) => a - b);
    expect(ids).toEqual([...Array(53).keys()]);
  });

  it('formats and colours cards', () => {
    expect(cardText({ id: 0, rank: '10', suit: 'hearts' })).toBe('10♥');
    expect(cardText({ id: 0, rank: 'JOKER', suit: null })).toBe('★');
    expect(isRed({ suit: 'diamonds' })).toBe(true);
    expect(isRed({ suit: 'spades' })).toBe(false);
  });
});
