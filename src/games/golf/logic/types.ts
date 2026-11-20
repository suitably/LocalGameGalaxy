/**
 * Golf domain types [ID: LOGIC-GOLF-TYPES]
 *
 * Each player has six slots in two rows of three (slots 0-2 top, 3-5 bottom). All information
 * is public: a slot is either face up or face down, and every card is known to the engine only.
 */

export type { Card, Rank, Suit } from '../../../modules/playing-cards';
import type { Card } from '../../../modules/playing-cards';

export interface GolfPlayer {
  id: string;
  name: string;
  /** Always six cards. */
  hand: Card[];
  /** Parallel to `hand`: true when the slot lies face up. */
  faceUp: boolean[];
  /** Cumulative score over all finished holes. */
  totalScore: number;
}

export type GolfPhase =
  /** Every player flips two of their own cards, one player after another. */
  | 'flip_start'
  /** Current player may draw. */
  | 'turn'
  /** Current player holds a drawn card and must swap or discard it. */
  | 'drawn'
  /** Hole finished, all cards revealed and scored. */
  | 'round_over'
  /** Last hole finished. */
  | 'game_over';

export interface DrawnCard {
  card: Card;
  source: 'deck' | 'discard';
}

export interface HoleResult {
  /** Score per player, same order as `players`. */
  scores: number[];
}

export interface GolfState {
  players: GolfPlayer[];
  /** Top of the deck is the last element. */
  deck: Card[];
  /** Top of the discard pile is the last element. */
  discard: Card[];
  phase: GolfPhase;
  currentIndex: number;
  /** Cards the current player has flipped during `flip_start`. */
  startFlips: number;
  drawn: DrawnCard | null;
  /** Index of the player who first had all cards face up, or null. */
  closerIndex: number | null;
  /** Turns left for the other players after the closer finished. */
  finalTurnsLeft: number;
  /** 1-based number of the current hole. */
  roundNumber: number;
  totalRounds: number;
  /** Results of all finished holes. */
  history: HoleResult[];
  /** Ids of the winners once the game is over. */
  winnerIds: string[];
}

export type GolfAction =
  | { type: 'flip_start'; slot: number }
  | { type: 'draw'; source: 'deck' | 'discard' }
  | { type: 'swap'; slot: number }
  /** `slot` is the face-down card to flip; omit only when no card is face down. */
  | { type: 'discard_drawn'; slot?: number }
  | { type: 'next_round' };

export type GolfError =
  | 'wrong_phase'
  | 'invalid_slot'
  | 'already_face_up'
  | 'deck_empty'
  | 'discard_empty'
  | 'must_swap'
  | 'must_flip';

export type GolfResult = { ok: true; state: GolfState } | { ok: false; error: GolfError };
