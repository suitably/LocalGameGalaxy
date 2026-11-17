/**
 * Playing card types shared by all card games [ID: MOD-PLAYING-CARDS-TYPES]
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/** `JOKER` cards have no suit. */
export type Rank =
  'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';

export interface Card {
  /** Unique within one deck, stable while the card moves between piles and hands. */
  id: number;
  rank: Rank;
  suit: Suit | null;
}
