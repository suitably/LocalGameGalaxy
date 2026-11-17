/**
 * Cabo domain types [ID: LOGIC-CABO-TYPES]
 *
 * A round deals four cards per player, face down. Players remember the cards they have seen
 * (`memory`, by card id). The UI shows a card face up only when its id is in the viewer's memory.
 */

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/** `JOKER` cards have no suit. */
export type Rank =
  'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';

export interface Card {
  /** Unique within one game (0..53), stable while the card moves between piles. */
  id: number;
  rank: Rank;
  suit: Suit | null;
}

/** Special power of a discarded card. Only powers of cards discarded straight from the deck count. */
export type Power = 'peek_own' | 'peek_other' | 'blind_swap';

export interface CaboPlayer {
  id: string;
  name: string;
  /** Always four cards; index 2 and 3 are the bottom row, which every player may see at the start. */
  hand: Card[];
  /** Card ids this player has seen during the game. */
  memory: number[];
  /** Cumulative score over all finished rounds. */
  totalScore: number;
}

export type CaboPhase =
  /** Current player may draw or call Cabo. */
  | 'turn'
  /** Current player holds a drawn card and must swap or discard it. */
  | 'drawn'
  /** Current player discarded a power card and may use or skip the power. */
  | 'power'
  | 'round_over'
  | 'game_over';

export interface DrawnCard {
  card: Card;
  source: 'deck' | 'discard';
}

export interface RoundResult {
  roundNumber: number;
  /** Round score per player (hand value plus any Cabo penalty), in player order. */
  roundScores: number[];
  handValues: number[];
  callerId: string | null;
  callerPenalty: boolean;
}

export interface CaboState {
  players: CaboPlayer[];
  /** Draw pile; the next card to draw is the last element. */
  deck: Card[];
  /** Discard pile, face up; the top card is the last element. */
  discard: Card[];
  phase: CaboPhase;
  currentIndex: number;
  drawn: DrawnCard | null;
  /** Set while `phase` is `power`. */
  power: Power | null;
  /** Player who called Cabo this round, if any. */
  callerId: string | null;
  roundNumber: number;
  /** Cumulative score at which the game ends. */
  targetScore: number;
  /** Last finished round; shown on the round summary. */
  lastRound: RoundResult | null;
  /** Players with the lowest total when the game ended. */
  winnerIds: string[];
}

export type CaboAction =
  | { type: 'draw'; source: 'deck' | 'discard' }
  | { type: 'call_cabo' }
  | { type: 'swap'; slot: number }
  | { type: 'discard_drawn' }
  | { type: 'power_peek_own'; slot: number }
  | { type: 'power_peek_other'; targetId: string; slot: number }
  | { type: 'power_blind_swap'; slot: number; targetId: string; targetSlot: number }
  | { type: 'skip_power' }
  | { type: 'next_round' };

export type CaboErrorCode =
  | 'wrong_phase'
  | 'invalid_slot'
  | 'invalid_target'
  | 'cabo_already_called'
  | 'no_power'
  | 'must_swap'
  | 'no_card_to_draw';

export type CaboResult = { ok: true; state: CaboState } | { ok: false; error: CaboErrorCode };
