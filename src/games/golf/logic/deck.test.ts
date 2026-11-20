import { describe, it, expect } from 'vitest';
import { cardValue, createDeck, handScore } from './deck';
import type { Card, Rank, Suit } from './types';

const c = (id: number, rank: Rank, suit: Suit | null = 'clubs'): Card => ({ id, rank, suit });

describe('golf deck', () => {
  it('uses one deck up to 4 players and two decks with unique ids for 5-6', () => {
    expect(createDeck(4)).toHaveLength(54);
    const two = createDeck(5);
    expect(two).toHaveLength(108);
    expect(new Set(two.map((x) => x.id)).size).toBe(108);
  });

  it('values cards', () => {
    expect(cardValue(c(0, 'A'))).toBe(1);
    expect(cardValue(c(0, '9'))).toBe(9);
    expect(cardValue(c(0, 'J'))).toBe(10);
    expect(cardValue(c(0, 'Q'))).toBe(10);
    expect(cardValue(c(0, 'K'))).toBe(0);
    expect(cardValue(c(0, 'JOKER', null))).toBe(-2);
  });

  it('scores column pairs as 0 but never pairs jokers', () => {
    const hand = [c(0, '5'), c(1, '3'), c(2, 'K'), c(3, '5', 'hearts'), c(4, '4'), c(5, '2')];
    expect(handScore(hand)).toBe(0 + 3 + 4 + 0 + 0 + 2);
    const jokers = [
      c(0, 'JOKER', null),
      c(1, 'A'),
      c(2, 'A'),
      c(3, 'JOKER', null),
      c(4, 'A'),
      c(5, 'A'),
    ];
    expect(handScore(jokers)).toBe(-4);
  });

  it('does not pair cards in the same row', () => {
    const hand = [c(0, '5'), c(1, '5'), c(2, '5'), c(3, 'A'), c(4, '2'), c(5, '3')];
    expect(handScore(hand)).toBe(5 + 5 + 5 + 1 + 2 + 3);
  });
});
