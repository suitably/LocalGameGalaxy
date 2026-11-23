/**
 * Cabo constants, state type and card powers [ID: LOGIC-TABLETOP-SCRIPT-CABO-RULES]
 *
 * Leaf shared by `cabo.ts` and `caboView.ts` (they must not import each other).
 */
import { rankOf } from './cardDeck';
import type { CardId } from './cardDeck';
import type { SlotRef } from './scriptTypes';

export const HAND = 4;
export const TARGET = 100;
export const PENALTY = 10;
export const START_PEEK = [2, 3];

export type CaboPower = 'peekOwn' | 'peekOther' | 'blindSwap';

export interface CaboState {
  totals: number[];
  round: number;
  hands: CardId[][];
  stock: CardId[];
  /** Top card is the last element. */
  discard: CardId[];
  /** `peek`: the seat to act looks at its bottom two cards. */
  phase: 'peek' | 'turn' | 'drawn' | 'power' | 'reveal' | 'roundEnd' | 'matchEnd';
  turn: number;
  /** Seats that already did the start peek. */
  peeked: number;
  drawn: { card: CardId; fromStock: boolean } | null;
  power: CaboPower | null;
  /** Own slot picked for a blind swap. */
  swapFrom: number | null;
  /** Card the seat to act looks at during `reveal`. */
  revealed: SlotRef | null;
  caller: number | null;
  result: { values: number[]; scores: number[]; penalty: boolean; resets: number[] } | null;
  /** Option `memoryAid`: cards a seat has seen stay face up for it. */
  memoryAid: boolean;
  /** Card ids each seat has seen this round (start peek, draws, peeks). */
  seen: CardId[][];
}

export function powerOf(card: CardId): CaboPower | null {
  const rank = rankOf(card);
  if (rank === '7' || rank === '8') return 'peekOwn';
  if (rank === '9' || rank === '10') return 'peekOther';
  if (rank === 'J' || rank === 'Q') return 'blindSwap';
  return null;
}
