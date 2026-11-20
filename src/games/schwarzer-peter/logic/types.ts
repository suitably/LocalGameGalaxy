/**
 * Schwarzer Peter rules state [ID: LOGIC-SP-TYPES]
 */
import type { Card, Rank, Suit } from '../../../modules/playing-cards';

export type { Card, Rank, Suit };

/** Random source in [0, 1), injected so tests are deterministic. */
export type Rng = () => number;

export interface SPPlayer {
  id: string;
  name: string;
  hand: Card[];
  /** Pairs discarded automatically at the deal (shown on the first reveal). */
  initialPairs: number;
  /** Turns this player has finished in the current round. */
  turns: number;
  /** Rounds lost so far (Schwarzer Peter marks). */
  losses: number;
}

export type SPPhase = 'draw' | 'drawn' | 'round_over';

export interface DrawnInfo {
  card: Card;
  fromId: string;
  /** The hand card the drawn card was paired with (both discarded), or null. */
  pairedWith: Card | null;
}

export interface SPState {
  players: SPPlayer[];
  currentIndex: number;
  /** Player the current drawer takes from. */
  sourceIndex: number;
  startIndex: number;
  round: number;
  phase: SPPhase;
  drawn: DrawnInfo | null;
  /** Holder of the Schwarzer Peter once the round is over. */
  loserId: string | null;
}

export type SPAction = { type: 'draw'; index: number } | { type: 'done' } | { type: 'next_round' };

export type SPResult = { ok: true; state: SPState } | { ok: false; error: string };
