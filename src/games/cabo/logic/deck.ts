/**
 * Cabo deck: 52 standard cards plus 2 jokers, card values and special powers [ID: LOGIC-CABO-DECK]
 */
import { shuffle } from '../../../lib/utils/shuffle';
import type { Card, Power, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: readonly Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

export const DECK_SIZE = 54;

/** Creates the unshuffled 54-card deck with ids 0..53. */
export function createDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: id++, rank, suit });
    }
  }
  cards.push({ id: id++, rank: 'JOKER', suit: null });
  cards.push({ id: id++, rank: 'JOKER', suit: null });
  return cards;
}

export function shuffledDeck(): Card[] {
  return shuffle(createDeck());
}

/** Points of one card: A=1, 2..10 face value, J=11, Q=12, red K=0, black K=13, joker=0. */
export function cardValue(card: Card): number {
  switch (card.rank) {
    case 'A':
      return 1;
    case 'J':
      return 11;
    case 'Q':
      return 12;
    case 'K':
      return card.suit === 'hearts' || card.suit === 'diamonds' ? 0 : 13;
    case 'JOKER':
      return 0;
    default:
      return Number(card.rank);
  }
}

/** Power a card has when it is discarded straight from the deck. */
export function powerOf(card: Card): Power | null {
  switch (card.rank) {
    case '7':
    case '8':
      return 'peek_own';
    case '9':
    case '10':
      return 'peek_other';
    case 'J':
    case 'Q':
      return 'blind_swap';
    default:
      return null;
  }
}
