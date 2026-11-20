/**
 * Test helpers for Mau-Mau states [ID: LOGIC-MAUMAU-TESTUTILS]
 */
import type { Card, MauMauState, Rank, Suit } from './types';

let nextId = 100;
export const c = (rank: Rank, suit: Suit): Card => ({ id: nextId++, rank, suit });

/** Builds a running state: hands per player, top discard card and draw pile (top = last). */
export function makeState(
  hands: Card[][],
  top: Card,
  deck: Card[] = [],
  patch: Partial<MauMauState> = {},
): MauMauState {
  return {
    players: hands.map((hand, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, hand, wins: 0 })),
    deck,
    discard: [top],
    phase: 'turn',
    currentIndex: 0,
    pendingDraw: 0,
    wishedSuit: null,
    drawnId: null,
    roundNumber: 1,
    winnerId: null,
    ...patch,
  };
}
