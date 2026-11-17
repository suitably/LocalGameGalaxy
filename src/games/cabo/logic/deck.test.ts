import { describe, it, expect } from 'vitest';
import { DECK_SIZE, cardValue, createDeck, powerOf } from './deck';
import type { Card, Rank, Suit } from './types';

const c = (id: number, rank: Rank, suit: Suit | null = 'clubs'): Card => ({ id, rank, suit });

describe('deck', () => {
  it('has 54 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((card) => card.id)).size).toBe(DECK_SIZE);
  });

  it('values cards: red king 0, black king 13, joker 0, ace 1, jack 11', () => {
    expect(cardValue(c(0, 'K', 'hearts'))).toBe(0);
    expect(cardValue(c(0, 'K', 'diamonds'))).toBe(0);
    expect(cardValue(c(0, 'K', 'clubs'))).toBe(13);
    expect(cardValue(c(0, 'K', 'spades'))).toBe(13);
    expect(cardValue(c(0, 'JOKER', null))).toBe(0);
    expect(cardValue(c(0, 'A'))).toBe(1);
    expect(cardValue(c(0, '10'))).toBe(10);
    expect(cardValue(c(0, 'J'))).toBe(11);
    expect(cardValue(c(0, 'Q'))).toBe(12);
  });

  it('assigns powers to 7-10 and J/Q only', () => {
    expect(powerOf(c(0, '7'))).toBe('peek_own');
    expect(powerOf(c(0, '8'))).toBe('peek_own');
    expect(powerOf(c(0, '9'))).toBe('peek_other');
    expect(powerOf(c(0, '10'))).toBe('peek_other');
    expect(powerOf(c(0, 'J'))).toBe('blind_swap');
    expect(powerOf(c(0, 'Q'))).toBe('blind_swap');
    expect(powerOf(c(0, 'K'))).toBeNull();
    expect(powerOf(c(0, 'A'))).toBeNull();
  });
});
