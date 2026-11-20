/**
 * Standard playing cards for scripted card games [ID: LOGIC-TABLETOP-SCRIPTED-CARDS]
 *
 * A card is its id: suit letter + rank (`H10`, `SA`, `CJ`). Suits: clubs, spades, hearts, diamonds.
 */
import { shuffled, type Rng } from '../../logic/rng';

export type Suit = 'C' | 'S' | 'H' | 'D';
export type CardId = string;

export const SUITS: readonly Suit[] = ['C', 'S', 'H', 'D'];
export const SUIT_SYMBOL: Record<Suit, string> = { C: '♣', S: '♠', H: '♥', D: '♦' };

export const RANKS_52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export const RANKS_36 = RANKS_52.slice(4);
export const RANKS_32 = RANKS_52.slice(5);

export const suitOf = (card: CardId): Suit => card[0] as Suit;
export const rankOf = (card: CardId): string => card.slice(1);

/** Position of the card's rank in `ranks` (low to high). */
export const rankIndex = (card: CardId, ranks: readonly string[] = RANKS_52): number =>
  ranks.indexOf(rankOf(card));

export function makeDeck(ranks: readonly string[]): CardId[] {
  return SUITS.flatMap((suit) => ranks.map((rank) => `${suit}${rank}`));
}

export const shuffledDeck = (ranks: readonly string[], rng: Rng): CardId[] =>
  shuffled(makeDeck(ranks), rng);

/** `♥10`: for status texts. */
export const cardText = (card: CardId): string => `${SUIT_SYMBOL[suitOf(card)]}${rankOf(card)}`;

/** Sorted copy: by suit (in `suitOrder`), then by rank low to high. */
export function sortCards(
  cards: readonly CardId[],
  ranks: readonly string[] = RANKS_52,
  suitOrder: readonly Suit[] = SUITS,
): CardId[] {
  return [...cards].sort(
    (a, b) =>
      suitOrder.indexOf(suitOf(a)) - suitOrder.indexOf(suitOf(b)) ||
      rankIndex(a, ranks) - rankIndex(b, ranks),
  );
}

export const without = (cards: readonly CardId[], remove: readonly CardId[]): CardId[] =>
  cards.filter((c) => !remove.includes(c));

/** Every card of `subset` is in `cards`, without duplicates. */
export const holdsAll = (cards: readonly CardId[], subset: readonly CardId[]): boolean =>
  new Set(subset).size === subset.length && subset.every((c) => cards.includes(c));

/** The seat after `seat` (clockwise) for which `ok` holds; `seat` itself if none other. */
export function nextSeat(seat: number, count: number, ok: (s: number) => boolean): number {
  for (let k = 1; k <= count; k++) {
    const s = (seat + k) % count;
    if (ok(s)) return s;
  }
  return seat;
}
