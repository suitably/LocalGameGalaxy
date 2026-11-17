/**
 * Golf deck and scoring: 52 cards plus 2 jokers, doubled for 5-6 players [ID: LOGIC-GOLF-DECK]
 */
import {
  createDeck as createPlayingDeck,
  shuffledDeck as shufflePlayingDeck,
} from '../../../modules/playing-cards';
import { shuffle } from '../../../lib/utils/shuffle';
import type { Card } from './types';

export const SINGLE_DECK_SIZE = 54;

/** Deck for the given player count; the second deck's ids are offset by 54 to stay unique. */
export function createDeck(playerCount: number): Card[] {
  const first = createPlayingDeck({ jokers: 2 });
  if (playerCount <= 4) return first;
  const second = createPlayingDeck({ jokers: 2 }).map((c) => ({
    ...c,
    id: c.id + SINGLE_DECK_SIZE,
  }));
  return [...first, ...second];
}

export function shuffledDeck(playerCount: number): Card[] {
  if (playerCount <= 4) return shufflePlayingDeck({ jokers: 2 });
  return shuffle(createDeck(playerCount));
}

/** A=1, 2-10 face value, J=Q=10, K=0, joker=-2. */
export function cardValue(card: Card): number {
  switch (card.rank) {
    case 'A':
      return 1;
    case 'J':
    case 'Q':
      return 10;
    case 'K':
      return 0;
    case 'JOKER':
      return -2;
    default:
      return Number(card.rank);
  }
}

/** Score of six cards: equal ranks in one column (slot i and i+3) count 0; jokers never cancel. */
export function handScore(hand: readonly Card[]): number {
  let sum = 0;
  for (let col = 0; col < 3; col++) {
    const top = hand[col];
    const bottom = hand[col + 3];
    const pair = top.rank === bottom.rank && top.rank !== 'JOKER';
    if (!pair) sum += cardValue(top) + cardValue(bottom);
  }
  return sum;
}
