/**
 * Golf rules engine: pure state transitions for six-card golf [ID: LOGIC-GOLF-ENGINE]
 *
 * - 6 cards per player in 2x3, face down; each player flips two at the start.
 * - A turn draws from the deck or takes the top discard, then swaps it into a slot (the old card
 *   goes face up onto the discard pile) or, if drawn from the deck, discards it and flips a
 *   face-down card (plain discard when none is left).
 * - When a player has all six cards face up, every other player gets one more turn.
 * - 9 holes; the starting player rotates; lowest total wins, ties share the win.
 */
import { shuffle } from '../../../lib/utils/shuffle';
import { handScore, shuffledDeck } from './deck';
import type { Card, GolfAction, GolfError, GolfPlayer, GolfResult, GolfState } from './types';

export const HAND_SIZE = 6;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const TOTAL_ROUNDS = 9;
export const START_FLIPS = 2;

export interface CreateGameOptions {
  /** Top of the deck is the last element. Defaults to a shuffled deck. */
  deck?: Card[];
  totalRounds?: number;
}

function dealRound(
  players: GolfPlayer[],
  roundNumber: number,
  totalRounds: number,
  history: GolfState['history'],
  deckInput: Card[],
): GolfState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Golf needs ${MIN_PLAYERS}-${MAX_PLAYERS} players, got ${players.length}`);
  }
  const deck = [...deckInput];
  const take = (): Card => {
    const card = deck.pop();
    if (!card) throw new Error('Deck too small to deal');
    return card;
  };
  const dealt = players.map((p) => ({
    ...p,
    hand: Array.from({ length: HAND_SIZE }, take),
    faceUp: Array<boolean>(HAND_SIZE).fill(false),
  }));
  return {
    players: dealt,
    deck,
    discard: [take()],
    phase: 'flip_start',
    currentIndex: (roundNumber - 1) % players.length,
    startFlips: 0,
    drawn: null,
    closerIndex: null,
    finalTurnsLeft: 0,
    roundNumber,
    totalRounds,
    history,
    winnerIds: [],
  };
}

export function createGame(playerNames: string[], options: CreateGameOptions = {}): GolfState {
  const players: GolfPlayer[] = playerNames.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    hand: [],
    faceUp: [],
    totalScore: 0,
  }));
  return dealRound(
    players,
    1,
    options.totalRounds ?? TOTAL_ROUNDS,
    [],
    options.deck ?? shuffledDeck(players.length),
  );
}

const ok = (state: GolfState): GolfResult => ({ ok: true, state });
const fail = (error: GolfError): GolfResult => ({ ok: false, error });
const isSlot = (slot: unknown): slot is number =>
  typeof slot === 'number' && Number.isInteger(slot) && slot >= 0 && slot < HAND_SIZE;

function patchCurrent(state: GolfState, patch: Partial<GolfPlayer>): GolfPlayer[] {
  return state.players.map((p, i) => (i === state.currentIndex ? { ...p, ...patch } : p));
}

function setSlot(player: GolfPlayer, slot: number, card: Card): Partial<GolfPlayer> {
  return {
    hand: player.hand.map((c, i) => (i === slot ? card : c)),
    faceUp: player.faceUp.map((f, i) => (i === slot ? true : f)),
  };
}

/** Takes the deck top; reshuffles the discard pile (except its top) when the deck is empty. */
function takeFromDeck(
  state: GolfState,
  shuffleFn: (cards: Card[]) => Card[],
): { card: Card; deck: Card[]; discard: Card[] } | null {
  let { deck, discard } = state;
  if (deck.length === 0) {
    if (discard.length <= 1) return null;
    deck = shuffleFn(discard.slice(0, -1));
    discard = [discard[discard.length - 1]];
  }
  return { card: deck[deck.length - 1], deck: deck.slice(0, -1), discard };
}

function finishRound(state: GolfState): GolfState {
  const scores = state.players.map((p) => handScore(p.hand));
  const players = state.players.map((p, i) => ({
    ...p,
    faceUp: Array<boolean>(HAND_SIZE).fill(true),
    totalScore: p.totalScore + scores[i],
  }));
  const history = [...state.history, { scores }];
  const over = state.roundNumber >= state.totalRounds;
  const best = Math.min(...players.map((p) => p.totalScore));
  return {
    ...state,
    players,
    history,
    drawn: null,
    phase: over ? 'game_over' : 'round_over',
    winnerIds: over ? players.filter((p) => p.totalScore === best).map((p) => p.id) : [],
  };
}

/** Ends the current turn: starts the final lap when a hand is complete, or finishes the hole. */
function endTurn(state: GolfState): GolfState {
  let { closerIndex, finalTurnsLeft } = state;
  if (closerIndex === null) {
    if (state.players[state.currentIndex].faceUp.every(Boolean)) {
      closerIndex = state.currentIndex;
      finalTurnsLeft = state.players.length - 1;
    }
  } else {
    finalTurnsLeft -= 1;
  }
  const base = { ...state, closerIndex, finalTurnsLeft, drawn: null };
  if (closerIndex !== null && finalTurnsLeft <= 0) return finishRound(base);
  return {
    ...base,
    phase: 'turn',
    currentIndex: (state.currentIndex + 1) % state.players.length,
  };
}

export function applyAction(
  state: GolfState,
  action: GolfAction,
  shuffleFn: (cards: Card[]) => Card[] = shuffle,
): GolfResult {
  const player = state.players[state.currentIndex];
  switch (action.type) {
    case 'flip_start': {
      if (state.phase !== 'flip_start') return fail('wrong_phase');
      if (!isSlot(action.slot)) return fail('invalid_slot');
      if (player.faceUp[action.slot]) return fail('already_face_up');
      const players = patchCurrent(state, setSlot(player, action.slot, player.hand[action.slot]));
      const flips = state.startFlips + 1;
      if (flips < START_FLIPS) return ok({ ...state, players, startFlips: flips });
      const next = (state.currentIndex + 1) % state.players.length;
      const firstIndex = (state.roundNumber - 1) % state.players.length;
      return ok({
        ...state,
        players,
        startFlips: 0,
        currentIndex: next,
        phase: next === firstIndex ? 'turn' : 'flip_start',
      });
    }
    case 'draw': {
      if (state.phase !== 'turn') return fail('wrong_phase');
      if (action.source === 'discard') {
        const card = state.discard[state.discard.length - 1];
        if (!card) return fail('discard_empty');
        return ok({
          ...state,
          discard: state.discard.slice(0, -1),
          drawn: { card, source: 'discard' },
          phase: 'drawn',
        });
      }
      const taken = takeFromDeck(state, shuffleFn);
      if (!taken) return fail('deck_empty');
      return ok({
        ...state,
        deck: taken.deck,
        discard: taken.discard,
        drawn: { card: taken.card, source: 'deck' },
        phase: 'drawn',
      });
    }
    case 'swap': {
      if (state.phase !== 'drawn' || !state.drawn) return fail('wrong_phase');
      if (!isSlot(action.slot)) return fail('invalid_slot');
      const old = player.hand[action.slot];
      return ok(
        endTurn({
          ...state,
          players: patchCurrent(state, setSlot(player, action.slot, state.drawn.card)),
          discard: [...state.discard, old],
        }),
      );
    }
    case 'discard_drawn': {
      if (state.phase !== 'drawn' || !state.drawn) return fail('wrong_phase');
      if (state.drawn.source === 'discard') return fail('must_swap');
      const hasHidden = player.faceUp.some((f) => !f);
      let players = state.players;
      if (hasHidden) {
        if (action.slot === undefined) return fail('must_flip');
        if (!isSlot(action.slot)) return fail('invalid_slot');
        if (player.faceUp[action.slot]) return fail('already_face_up');
        players = patchCurrent(state, setSlot(player, action.slot, player.hand[action.slot]));
      }
      return ok(endTurn({ ...state, players, discard: [...state.discard, state.drawn.card] }));
    }
    case 'next_round': {
      if (state.phase !== 'round_over') return fail('wrong_phase');
      const cards = [...state.deck, ...state.discard, ...state.players.flatMap((p) => p.hand)];
      return ok(
        dealRound(
          state.players,
          state.roundNumber + 1,
          state.totalRounds,
          state.history,
          shuffleFn(cards),
        ),
      );
    }
  }
}
