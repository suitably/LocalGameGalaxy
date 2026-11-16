/**
 * Skat: state of a round [ID: LOGIC-TABLETOP-SCRIPT-SKAT-TYPES]
 */
import type { CardId } from './cardDeck';
import type { SkatGame, SkatResult } from './skatRules';

export interface Bidding {
  /** Highest value said so far; 0: nothing yet. */
  value: number;
  speaker: number;
  listener: number;
  /** Who answers now; in stage 3 forehand alone decides whether to play at 18. */
  turn: 'speaker' | 'listener';
  stage: 1 | 2 | 3;
}

export interface SkatState {
  dealer: number;
  hands: CardId[][];
  skat: CardId[];
  phase: 'bidding' | 'pickup' | 'discard' | 'declare' | 'play' | 'roundEnd';
  bidding: Bidding;
  declarer: number | null;
  game: SkatGame | null;
  /** Current trick; a complete one stays until the winner leads again. */
  trick: { seat: number; card: CardId }[];
  turn: number;
  /** Cards won in tricks, per seat. */
  taken: CardId[][];
  tricks: number[];
  /** The declarer's twelve cards, for the matadors. */
  declarerCards: CardId[];
  result: SkatResult | null;
  scores: number[];
  rounds: number;
}

export const SEATS = 3;
