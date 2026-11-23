/**
 * Standard playing cards for scripted card games [ID: LOGIC-TABLETOP-SCRIPTED-CARDS]
 *
 * A card is its id: suit letter + rank (`H10`, `SA`, `CJ`). Suits: clubs, spades, hearts, diamonds.
 * Jokers are `X1`, `X2`, …; a card of a second deck carries `~2` (`H10~2`), so ids stay unique.
 */
import { shuffled, type Rng } from '../../logic/rng';

export type Suit = 'C' | 'S' | 'H' | 'D';
export type CardId = string;

export const SUITS: readonly Suit[] = ['C', 'S', 'H', 'D'];
export const SUIT_SYMBOL: Record<Suit, string> = { C: '♣', S: '♠', H: '♥', D: '♦' };

export const RANKS_52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export const RANKS_36 = RANKS_52.slice(4);
export const RANKS_32 = RANKS_52.slice(5);

export const isJoker = (card: CardId): boolean => card[0] === 'X';
/** The suit; meaningless for a joker (check `isJoker` first). */
export const suitOf = (card: CardId): Suit => card[0] as Suit;
/** `JOKER` for a joker; the deck copy (`~2`) is dropped. */
export const rankOf = (card: CardId): string =>
  isJoker(card) ? 'JOKER' : card.slice(1).split('~')[0];

/** Position of the card's rank in `ranks` (low to high). */
export const rankIndex = (card: CardId, ranks: readonly string[] = RANKS_52): number =>
  ranks.indexOf(rankOf(card));

export function makeDeck(ranks: readonly string[], jokers = 0): CardId[] {
  const jokerIds = Array.from({ length: jokers }, (_, i) => `X${i + 1}`);
  return [...SUITS.flatMap((suit) => ranks.map((rank) => `${suit}${rank}`)), ...jokerIds];
}

/** The same cards as a second deck (`~2`). */
export const secondDeck = (cards: readonly CardId[]): CardId[] => cards.map((c) => `${c}~2`);

export const shuffledDeck = (ranks: readonly string[], rng: Rng): CardId[] =>
  shuffled(makeDeck(ranks), rng);

/** `♥10`: for status texts. */
export const cardText = (card: CardId): string =>
  isJoker(card) ? '🃏' : `${SUIT_SYMBOL[suitOf(card)]}${rankOf(card)}`;

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
