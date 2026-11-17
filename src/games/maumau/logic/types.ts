/**
 * Mau-Mau domain types [ID: LOGIC-MAUMAU-TYPES]
 */
export type { Card, Rank, Suit } from '../../../modules/playing-cards';
import type { Card, Suit } from '../../../modules/playing-cards';

export interface MauMauPlayer {
  id: string;
  name: string;
  hand: Card[];
  /** Rounds won so far. */
  wins: number;
}

export type MauMauPhase =
  /** Current player may play, draw or take the seven penalty. */
  | 'turn'
  /** Current player drew (or could not draw); only the drawn card may be played, or pass. */
  | 'drawn'
  /** Current player played a jack and must wish a suit. */
  | 'wish'
  | 'round_over';

export interface MauMauState {
  players: MauMauPlayer[];
  /** Top of the draw pile is the last element. */
  deck: Card[];
  /** Top of the discard pile is the last element. */
  discard: Card[];
  phase: MauMauPhase;
  currentIndex: number;
  /** Cards the current player must draw unless they answer with a seven (2 per stacked seven). */
  pendingDraw: number;
  /** Suit wished after a jack; applies to the next card only. */
  wishedSuit: Suit | null;
  /** Card drawn this turn; the only playable card in phase 'drawn'. */
  drawnId: number | null;
  roundNumber: number;
  winnerId: string | null;
}

export type MauMauAction =
  | { type: 'play'; cardId: number }
  | { type: 'wish'; suit: Suit }
  | { type: 'draw' }
  | { type: 'take_penalty' }
  | { type: 'pass' }
  | { type: 'next_round' };

export type MauMauResult = { ok: true; state: MauMauState } | { ok: false; error: string };
