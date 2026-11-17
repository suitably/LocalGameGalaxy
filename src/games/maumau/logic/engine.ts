/**
 * Mau-Mau rules engine: pure state transitions for one device [ID: LOGIC-MAUMAU-ENGINE]
 *
 * 32-card Skat deck, 5 cards each, the start card has no effect. 7: next player draws 2 (or
 * stacks a 7). 8: next player is skipped. Jack: playable on anything except a jack, wishes a suit.
 * Drawing ends in phase 'drawn' (only the drawn card may be played, or pass), so the drawn
 * card is shown before the turn ends. First empty hand wins the round.
 */
import { shuffle as defaultShuffle } from '../../../lib/utils/shuffle';
import { SKAT_RANKS, createDeck } from '../../../modules/playing-cards';
import type { Card, MauMauAction, MauMauPlayer, MauMauResult, MauMauState } from './types';

export const HAND_SIZE = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
export const SEVEN_PENALTY = 2;

export type Shuffle = <T>(items: T[]) => T[];

export interface CreateGameOptions {
  /** Top of the deck is the last element. Defaults to a shuffled Skat deck. */
  deck?: Card[];
  shuffle?: Shuffle;
}

export const skatDeck = (): Card[] => createDeck({ ranks: SKAT_RANKS });

export const topCard = (state: Pick<MauMauState, 'discard'>): Card =>
  state.discard[state.discard.length - 1];

/** Whether `card` may be played on the current top card, ignoring phase restrictions. */
export function isPlayable(state: MauMauState, card: Card): boolean {
  if (state.pendingDraw > 0) return card.rank === '7';
  const top = topCard(state);
  if (card.rank === 'J') return top.rank !== 'J';
  if (state.wishedSuit) return card.suit === state.wishedSuit;
  return card.suit === top.suit || card.rank === top.rank;
}

/** Cards that can be played right now by the current player. */
export function playableCards(state: MauMauState): Card[] {
  if (state.phase === 'wish' || state.phase === 'round_over') return [];
  const hand = state.players[state.currentIndex].hand;
  const cards = state.phase === 'drawn' ? hand.filter((c) => c.id === state.drawnId) : hand;
  return cards.filter((c) => isPlayable(state, c));
}

/** Cards that could be drawn (deck plus reshuffleable discard pile). */
export const drawableCount = (state: MauMauState): number =>
  state.deck.length + Math.max(0, state.discard.length - 1);

export const canDraw = (state: MauMauState): boolean =>
  state.phase === 'turn' && state.pendingDraw === 0 && drawableCount(state) > 0;

function deal(players: MauMauPlayer[], roundNumber: number, deckInput: Card[]): MauMauState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Mau-Mau needs ${MIN_PLAYERS}-${MAX_PLAYERS} players, got ${players.length}`);
  }
  const deck = [...deckInput];
  const dealt = players.map((p) => ({ ...p, hand: [] as Card[] }));
  for (let i = 0; i < HAND_SIZE; i++) {
    for (const p of dealt) {
      const card = deck.pop();
      if (!card) throw new Error('Deck too small to deal');
      p.hand.push(card);
    }
  }
  const top = deck.pop();
  if (!top) throw new Error('Deck too small to deal');
  return {
    players: dealt,
    deck,
    discard: [top],
    phase: 'turn',
    currentIndex: (roundNumber - 1) % players.length,
    pendingDraw: 0,
    wishedSuit: null,
    drawnId: null,
    roundNumber,
    winnerId: null,
  };
}

export function createGame(playerNames: string[], options: CreateGameOptions = {}): MauMauState {
  const shuffle = options.shuffle ?? defaultShuffle;
  const players = playerNames.map((name, i) => ({ id: `p${i + 1}`, name, hand: [], wins: 0 }));
  return deal(players, 1, options.deck ?? shuffle(skatDeck()));
}

/** Draws up to `count` cards for the player, reshuffling the discard pile when the deck runs out. */
function drawCards(
  state: MauMauState,
  playerIndex: number,
  count: number,
  shuffle: Shuffle,
): { state: MauMauState; drawn: Card[] } {
  let deck = [...state.deck];
  let discard = [...state.discard];
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (deck.length === 0 && discard.length > 1) {
      const top = discard[discard.length - 1];
      deck = shuffle(discard.slice(0, -1));
      discard = [top];
    }
    const card = deck.pop();
    if (!card) break;
    drawn.push(card);
  }
  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: [...p.hand, ...drawn] } : p,
  );
  return { state: { ...state, players, deck, discard }, drawn };
}

function advance(state: MauMauState, steps: number): MauMauState {
  return {
    ...state,
    phase: 'turn',
    currentIndex: (state.currentIndex + steps) % state.players.length,
    drawnId: null,
  };
}

const fail = (error: string): MauMauResult => ({ ok: false, error });

function playCard(state: MauMauState, cardId: number): MauMauResult {
  if (state.phase !== 'turn' && state.phase !== 'drawn') return fail('Cannot play now');
  const me = state.players[state.currentIndex];
  const card = me.hand.find((c) => c.id === cardId);
  if (!card) return fail('Card not in hand');
  if (state.phase === 'drawn' && card.id !== state.drawnId) return fail('Only the drawn card');
  if (!isPlayable(state, card)) return fail('Card does not match');

  const hand = me.hand.filter((c) => c.id !== cardId);
  const players = state.players.map((p, i) => (i === state.currentIndex ? { ...p, hand } : p));
  const next: MauMauState = {
    ...state,
    players,
    discard: [...state.discard, card],
    wishedSuit: null,
    drawnId: null,
    pendingDraw: card.rank === '7' ? state.pendingDraw + SEVEN_PENALTY : 0,
  };
  if (hand.length === 0) {
    const won = players.map((p, i) => (i === state.currentIndex ? { ...p, wins: p.wins + 1 } : p));
    return { ok: true, state: { ...next, players: won, phase: 'round_over', winnerId: me.id } };
  }
  if (card.rank === 'J') return { ok: true, state: { ...next, phase: 'wish' } };
  return { ok: true, state: advance(next, card.rank === '8' ? 2 : 1) };
}

export function applyAction(
  state: MauMauState,
  action: MauMauAction,
  shuffle: Shuffle = defaultShuffle,
): MauMauResult {
  switch (action.type) {
    case 'play':
      return playCard(state, action.cardId);
    case 'wish':
      if (state.phase !== 'wish') return fail('No wish pending');
      return { ok: true, state: advance({ ...state, wishedSuit: action.suit }, 1) };
    case 'draw': {
      if (state.phase !== 'turn' || state.pendingDraw > 0) return fail('Cannot draw now');
      const { state: s, drawn } = drawCards(state, state.currentIndex, 1, shuffle);
      return { ok: true, state: { ...s, phase: 'drawn', drawnId: drawn[0]?.id ?? null } };
    }
    case 'take_penalty': {
      if (state.phase !== 'turn' || state.pendingDraw === 0) return fail('No penalty pending');
      const { state: s } = drawCards(state, state.currentIndex, state.pendingDraw, shuffle);
      return { ok: true, state: advance({ ...s, pendingDraw: 0 }, 1) };
    }
    case 'pass': {
      const stuck = state.phase === 'turn' && state.pendingDraw === 0 && drawableCount(state) === 0;
      if (state.phase !== 'drawn' && !stuck) return fail('Cannot pass now');
      return { ok: true, state: advance(state, 1) };
    }
    case 'next_round': {
      if (state.phase !== 'round_over') return fail('Round still running');
      return { ok: true, state: deal(state.players, state.roundNumber + 1, shuffle(skatDeck())) };
    }
  }
}
