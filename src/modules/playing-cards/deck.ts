/**
 * Deck building for card games: standard 52, Skat 32, optional jokers [ID: MOD-PLAYING-CARDS-DECK]
 */
import { shuffle } from '../../lib/utils/shuffle';
import type { Card, Rank, Suit } from './types';

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const STANDARD_RANKS: readonly Rank[] = [
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

/** German 32-card deck (Skat, Mau-Mau, Schwimmen): 7 to ace. */
export const SKAT_RANKS: readonly Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export interface DeckOptions {
  /** Ranks per suit; defaults to the 13 standard ranks. */
  ranks?: readonly Rank[];
  /** Number of jokers added after the suited cards (default 0). */
  jokers?: number;
}

/** Unshuffled deck, suit by suit, then jokers; ids run from 0. */
export function createDeck(options: DeckOptions = {}): Card[] {
  const ranks = options.ranks ?? STANDARD_RANKS;
  const cards: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of ranks) cards.push({ id: id++, rank, suit });
  }
  for (let i = 0; i < (options.jokers ?? 0); i++)
    cards.push({ id: id++, rank: 'JOKER', suit: null });
  return cards;
}

export function shuffledDeck(options: DeckOptions = {}): Card[] {
  return shuffle(createDeck(options));
}

export function isRed(card: Pick<Card, 'suit'>): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

/** Short text such as `10♥`; jokers read `★`. */
export function cardText(card: Card): string {
  if (card.rank === 'JOKER') return '★';
  return `${card.rank}${card.suit ? SUIT_SYMBOL[card.suit] : ''}`;
}
