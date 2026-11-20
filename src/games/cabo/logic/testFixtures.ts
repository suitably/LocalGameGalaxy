/** Shared fixtures for the Cabo engine tests (deterministic decks and an action runner). */
import { expect } from 'vitest';
import { applyAction, createGame } from './engine';
import type { Card, CaboResult, CaboState, Rank, Suit } from './types';

export const c = (id: number, rank: Rank, suit: Suit | null = 'clubs'): Card => ({
  id,
  rank,
  suit,
});

/** Deal order first (players in turn, four cards each), then the discard top, then the draw pile. */
export const deckFrom = (dealOrder: Card[]): Card[] => [...dealOrder].reverse();

/**
 * Ann (p1) holds 5, K♣(13), 9, 3 and Ben (p2) holds 2, K♥(0), A, Q.
 * Discard top is 6. Draw pile in order: 4♣, 7♣, 10♠, J♥.
 */
export const scenario = (targetScore = 100): CaboState =>
  createGame(['Ann', 'Ben'], {
    targetScore,
    deck: deckFrom([
      c(0, '5'),
      c(1, 'K', 'clubs'),
      c(2, '9', 'hearts'),
      c(3, '3', 'spades'),
      c(4, '2', 'diamonds'),
      c(5, 'K', 'hearts'),
      c(6, 'A', 'spades'),
      c(7, 'Q', 'clubs'),
      c(8, '6', 'diamonds'),
      c(9, '4', 'clubs'),
      c(10, '7', 'clubs'),
      c(11, '10', 'spades'),
      c(12, 'J', 'hearts'),
    ]),
  });

export function run(state: CaboState, ...actions: Parameters<typeof applyAction>[1][]): CaboState {
  let current = state;
  for (const action of actions) {
    const result = applyAction(current, action);
    if (!result.ok) throw new Error(`${action.type} failed: ${result.error}`);
    current = result.state;
  }
  return current;
}

export function expectError(result: CaboResult, error: string) {
  expect(result).toEqual({ ok: false, error });
}
