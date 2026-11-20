/**
 * Skat: card order, following suit, tricks and game values [ID: LOGIC-TABLETOP-SCRIPT-SKAT-RULES]
 *
 * International Skat Order, without announced Schneider/Schwarz and without Ramsch.
 */
import { RANKS_32, SUITS, rankOf, suitOf } from './cardDeck';
import type { CardId, Suit } from './cardDeck';

export type SkatGameType = Suit | 'grand' | 'null';

export interface SkatGame {
  type: SkatGameType;
  /** Played without picking up the skat. */
  hand: boolean;
  /** Null only: the declarer's cards lie open. */
  ouvert: boolean;
}

const JACKS: readonly CardId[] = ['CJ', 'SJ', 'HJ', 'DJ'];
/** Low to high in suit and grand games. */
const PLAIN_ORDER = ['7', '8', '9', 'Q', 'K', '10', 'A'];
const NULL_ORDER: readonly string[] = RANKS_32;
export const BASE_VALUE: Record<Suit | 'grand', number> = { D: 9, H: 10, S: 11, C: 12, grand: 24 };
const POINTS: Record<string, number> = { A: 11, '10': 10, K: 4, Q: 3, J: 2 };

export const cardPoints = (cards: readonly CardId[]): number =>
  cards.reduce((sum, c) => sum + (POINTS[rankOf(c)] ?? 0), 0);

export const isTrump = (card: CardId, type: SkatGameType): boolean =>
  type !== 'null' && (rankOf(card) === 'J' || suitOf(card) === type);

/** The suit a card counts as when following: trumps form their own suit. */
export const followSuit = (card: CardId, type: SkatGameType): Suit | 'trump' =>
  isTrump(card, type) ? 'trump' : suitOf(card);

/** Higher beats lower within the same `followSuit`. */
export function strength(card: CardId, type: SkatGameType): number {
  if (type === 'null') return NULL_ORDER.indexOf(rankOf(card));
  if (rankOf(card) === 'J') return 100 - JACKS.indexOf(card);
  return PLAIN_ORDER.indexOf(rankOf(card));
}

export function legalCards(hand: readonly CardId[], lead: CardId | undefined, type: SkatGameType) {
  if (!lead) return [...hand];
  const suit = followSuit(lead, type);
  const same = hand.filter((c) => followSuit(c, type) === suit);
  return same.length > 0 ? same : [...hand];
}

/** Index of the winning card of a complete trick (cards in playing order). */
export function trickWinner(cards: readonly CardId[], type: SkatGameType): number {
  let best = 0;
  for (let i = 1; i < cards.length; i++) {
    const a = followSuit(cards[i], type);
    const b = followSuit(cards[best], type);
    if (a === b ? strength(cards[i], type) > strength(cards[best], type) : a === 'trump') best = i;
  }
  return best;
}

/** Trumps from the top down. */
export function trumpSequence(type: Suit | 'grand'): CardId[] {
  if (type === 'grand') return [...JACKS];
  return [...JACKS, ...[...PLAIN_ORDER].reverse().map((rank) => `${type}${rank}`)];
}

/** Matadors: unbroken top trumps held ("with") or missing ("without"). */
export function matadors(cards: readonly CardId[], type: Suit | 'grand'): number {
  const sequence = trumpSequence(type);
  const withTop = cards.includes(sequence[0]);
  let count = 0;
  while (count < sequence.length && cards.includes(sequence[count]) === withTop) count++;
  return count;
}

export const nullValue = (game: Pick<SkatGame, 'hand' | 'ouvert'>): number => {
  if (game.ouvert) return game.hand ? 59 : 46;
  return game.hand ? 35 : 23;
};

/** Every value that can be bid, ascending (18 … 264). */
export const BID_VALUES: readonly number[] = [
  ...new Set([
    23,
    35,
    46,
    59,
    ...[9, 10, 11, 12].flatMap((base) => Array.from({ length: 17 }, (_, i) => base * (i + 2))),
    ...Array.from({ length: 10 }, (_, i) => 24 * (i + 2)),
  ]),
].sort((a, b) => a - b);

export const nextBid = (value: number): number | undefined => BID_VALUES.find((v) => v > value);

export interface SkatResult {
  declarer: number;
  game: SkatGame;
  bid: number;
  /** Card points of the declarer (tricks and skat); 0 in null games. */
  points: number;
  won: boolean;
  /** Game value; the declarer scores `value` or loses twice as much. */
  value: number;
  schneider: boolean;
  schwarz: boolean;
  overbid: boolean;
}

export function scoreGame(input: {
  declarer: number;
  game: SkatGame;
  bid: number;
  /** The declarer's ten cards and the skat as dealt or discarded. */
  cards: readonly CardId[];
  /** Cards the declarer took in tricks plus the skat. */
  taken: readonly CardId[];
  declarerTricks: number;
  tricksPlayed: number;
}): SkatResult {
  const { declarer, game, bid } = input;
  const flags = { schneider: false, schwarz: false, overbid: false };
  if (game.type === 'null') {
    const value = nullValue(game);
    const won = input.declarerTricks === 0 && value >= bid;
    return { declarer, game, bid, points: 0, won, value, ...flags, overbid: value < bid };
  }
  const points = cardPoints(input.taken);
  const made = points >= 61;
  const schwarz = input.declarerTricks === (made ? input.tricksPlayed : 0);
  const schneider = schwarz || (made ? points >= 90 : points <= 30);
  const base = BASE_VALUE[game.type];
  const factor =
    matadors(input.cards, game.type) + 1 + Number(game.hand) + Number(schneider) + Number(schwarz);
  let value = factor * base;
  const overbid = value < bid;
  if (overbid) value = Math.ceil(bid / base) * base;
  return { declarer, game, bid, points, won: made && !overbid, value, schneider, schwarz, overbid };
}

/** Hand order for display: trumps first (high to low), then the suits. */
export function sortSkatHand(cards: readonly CardId[], type: SkatGameType): CardId[] {
  const group = (c: CardId) => (isTrump(c, type) ? -1 : SUITS.indexOf(suitOf(c)));
  return [...cards].sort((a, b) => group(a) - group(b) || strength(b, type) - strength(a, type));
}
