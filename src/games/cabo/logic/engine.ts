/**
 * Cabo rules engine: pure state transitions for one device with pass-and-play [ID: LOGIC-CABO-ENGINE]
 *
 * Rules implemented (house rules where noted):
 * - 4 cards per player, dealt face down. Each player sees the bottom two cards (slots 2 and 3)
 *   before the first turn.
 * - A turn is either "draw" (from the deck or the discard pile) or "call Cabo" (instead of drawing).
 * - A drawn card is swapped into the hand, or discarded. A card taken from the discard pile must
 *   be swapped (house rule: no immediate return to the pile).
 * - Discarding a 7/8 peeks one own card, 9/10 peeks one opponent card, J/Q blind-swaps one own
 *   card with one opponent card. Powers are optional and only apply to cards discarded from the deck.
 * - After Cabo is called, every other player gets one final turn.
 * - Scoring: sum of hand values (A=1, 2-10 face, J=11, Q=12, red K=0, black K=13, joker=0).
 *   The caller gets +10 unless their hand is strictly the lowest.
 * - The game ends when a total reaches the target score; the lowest total wins.
 *
 * House rules not in the printed rules: no "snap" discards out of turn.
 */
import { shuffle } from '../../../lib/utils/shuffle';
import { cardValue, powerOf, shuffledDeck } from './deck';
import type { Card, CaboAction, CaboPlayer, CaboResult, CaboState, RoundResult } from './types';

export const HAND_SIZE = 4;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const CABO_PENALTY = 10;
export const DEFAULT_TARGET_SCORE = 100;

export interface CreateGameOptions {
  targetScore?: number;
  /** Top of the deck is the last element. Defaults to a shuffled deck. */
  deck?: Card[];
}

export function handValue(hand: readonly Card[]): number {
  return hand.reduce((sum, card) => sum + cardValue(card), 0);
}

/** Deals a new round. Players keep their totals; the first player rotates with the round number. */
function dealRound(
  players: CaboPlayer[],
  roundNumber: number,
  targetScore: number,
  deckInput: Card[],
): CaboState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`Cabo needs ${MIN_PLAYERS}-${MAX_PLAYERS} players, got ${players.length}`);
  }
  const deck = [...deckInput];
  const dealt: CaboPlayer[] = players.map((player) => {
    const hand: Card[] = [];
    for (let i = 0; i < HAND_SIZE; i++) {
      const card = deck.pop();
      if (!card) throw new Error('Deck too small to deal');
      hand.push(card);
    }
    return {
      ...player,
      hand,
      memory: [hand[2].id, hand[3].id],
    };
  });
  const top = deck.pop();
  if (!top) throw new Error('Deck too small to deal');

  return {
    players: dealt,
    deck,
    discard: [top],
    phase: 'turn',
    currentIndex: (roundNumber - 1) % players.length,
    drawn: null,
    power: null,
    callerId: null,
    roundNumber,
    targetScore,
    lastRound: null,
    winnerIds: [],
  };
}

export function createGame(playerNames: string[], options: CreateGameOptions = {}): CaboState {
  const players: CaboPlayer[] = playerNames.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    hand: [],
    memory: [],
    totalScore: 0,
  }));
  return dealRound(
    players,
    1,
    options.targetScore ?? DEFAULT_TARGET_SCORE,
    options.deck ?? shuffledDeck(),
  );
}

function ok(state: CaboState): CaboResult {
  return { ok: true, state };
}

function fail(error: Extract<CaboResult, { ok: false }>['error']): CaboResult {
  return { ok: false, error };
}

function isSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < HAND_SIZE;
}

function patchPlayer(
  players: CaboPlayer[],
  index: number,
  patch: Partial<CaboPlayer>,
): CaboPlayer[] {
  return players.map((p, i) => (i === index ? { ...p, ...patch } : p));
}

function currentPlayer(state: CaboState): CaboPlayer {
  return state.players[state.currentIndex];
}

/** Takes the top card of the deck; reshuffles the discard pile (except its top) when the deck is empty. */
function takeFromDeck(state: CaboState): { card: Card; deck: Card[]; discard: Card[] } | null {
  let deck = state.deck;
  let discard = state.discard;
  if (deck.length === 0) {
    if (discard.length <= 1) return null;
    const top = discard[discard.length - 1];
    deck = shuffle(discard.slice(0, -1));
    discard = [top];
  }
  const card = deck[deck.length - 1];
  return { card, deck: deck.slice(0, -1), discard };
}

/** Moves to the next player, or ends the round when the turn comes back to the Cabo caller. */
function endTurn(state: CaboState): CaboResult {
  const next = (state.currentIndex + 1) % state.players.length;
  if (state.callerId !== null && state.players[next].id === state.callerId) {
    return ok(finishRound(state));
  }
  return ok({ ...state, currentIndex: next, phase: 'turn', drawn: null, power: null });
}

function finishRound(state: CaboState): CaboState {
  const handValues = state.players.map((p) => handValue(p.hand));
  const callerIndex = state.players.findIndex((p) => p.id === state.callerId);
  const callerPenalty =
    callerIndex >= 0 &&
    handValues.some((value, i) => i !== callerIndex && value <= handValues[callerIndex]);
  const roundScores = handValues.map((value, i) =>
    i === callerIndex && callerPenalty ? value + CABO_PENALTY : value,
  );

  const players = state.players.map((p, i) => ({
    ...p,
    totalScore: p.totalScore + roundScores[i],
  }));
  const lastRound: RoundResult = {
    roundNumber: state.roundNumber,
    roundScores,
    handValues,
    callerId: state.callerId,
    callerPenalty,
  };

  const gameOver = players.some((p) => p.totalScore >= state.targetScore);
  const lowest = Math.min(...players.map((p) => p.totalScore));
  return {
    ...state,
    players,
    phase: gameOver ? 'game_over' : 'round_over',
    drawn: null,
    power: null,
    lastRound,
    winnerIds: gameOver ? players.filter((p) => p.totalScore === lowest).map((p) => p.id) : [],
  };
}

function draw(state: CaboState, source: 'deck' | 'discard'): CaboResult {
  if (state.phase !== 'turn') return fail('wrong_phase');

  let card: Card;
  let deck = state.deck;
  let discard = state.discard;
  if (source === 'deck') {
    const taken = takeFromDeck(state);
    if (!taken) return fail('no_card_to_draw');
    card = taken.card;
    deck = taken.deck;
    discard = taken.discard;
  } else {
    if (discard.length === 0) return fail('no_card_to_draw');
    card = discard[discard.length - 1];
    discard = discard.slice(0, -1);
  }

  const index = state.currentIndex;
  const players = patchPlayer(state.players, index, {
    memory: [...currentPlayer(state).memory, card.id],
  });
  return ok({
    ...state,
    players,
    deck,
    discard,
    phase: 'drawn',
    drawn: { card, source },
  });
}

function callCabo(state: CaboState): CaboResult {
  if (state.phase !== 'turn') return fail('wrong_phase');
  if (state.callerId !== null) return fail('cabo_already_called');
  return endTurn({ ...state, callerId: currentPlayer(state).id });
}

function swap(state: CaboState, slot: number): CaboResult {
  if (state.phase !== 'drawn' || !state.drawn) return fail('wrong_phase');
  if (!isSlot(slot)) return fail('invalid_slot');

  const index = state.currentIndex;
  const hand = [...currentPlayer(state).hand];
  const old = hand[slot];
  hand[slot] = state.drawn.card;
  return endTurn({
    ...state,
    players: patchPlayer(state.players, index, { hand }),
    discard: [...state.discard, old],
  });
}

function discardDrawn(state: CaboState): CaboResult {
  if (state.phase !== 'drawn' || !state.drawn) return fail('wrong_phase');
  if (state.drawn.source === 'discard') return fail('must_swap');

  const { card } = state.drawn;
  const discard = [...state.discard, card];
  const power = powerOf(card);
  if (power) {
    return ok({ ...state, discard, phase: 'power', power, drawn: null });
  }
  return endTurn({ ...state, discard });
}

function requirePower(state: CaboState, power: CaboState['power']): CaboResult | null {
  if (state.phase !== 'power') return fail('wrong_phase');
  if (state.power !== power) return fail('no_power');
  return null;
}

function findTarget(state: CaboState, targetId: string): number {
  return state.players.findIndex((p) => p.id === targetId && p.id !== currentPlayer(state).id);
}

function powerPeekOwn(state: CaboState, slot: number): CaboResult {
  const blocked = requirePower(state, 'peek_own');
  if (blocked) return blocked;
  if (!isSlot(slot)) return fail('invalid_slot');

  const index = state.currentIndex;
  const memory = [...currentPlayer(state).memory, currentPlayer(state).hand[slot].id];
  return endTurn({ ...state, players: patchPlayer(state.players, index, { memory }) });
}

function powerPeekOther(state: CaboState, targetId: string, slot: number): CaboResult {
  const blocked = requirePower(state, 'peek_other');
  if (blocked) return blocked;
  const target = findTarget(state, targetId);
  if (target < 0) return fail('invalid_target');
  if (!isSlot(slot)) return fail('invalid_slot');

  const index = state.currentIndex;
  const memory = [...currentPlayer(state).memory, state.players[target].hand[slot].id];
  return endTurn({ ...state, players: patchPlayer(state.players, index, { memory }) });
}

function powerBlindSwap(
  state: CaboState,
  slot: number,
  targetId: string,
  targetSlot: number,
): CaboResult {
  const blocked = requirePower(state, 'blind_swap');
  if (blocked) return blocked;
  const target = findTarget(state, targetId);
  if (target < 0) return fail('invalid_target');
  if (!isSlot(slot) || !isSlot(targetSlot)) return fail('invalid_slot');

  const index = state.currentIndex;
  const own = [...currentPlayer(state).hand];
  const other = [...state.players[target].hand];
  [own[slot], other[targetSlot]] = [other[targetSlot], own[slot]];

  let players = patchPlayer(state.players, index, { hand: own });
  players = patchPlayer(players, target, { hand: other });
  return endTurn({ ...state, players });
}

/** Applies one player action. Returns the new state, or an error code and no change. */
export function applyAction(state: CaboState, action: CaboAction): CaboResult {
  switch (action.type) {
    case 'draw':
      return draw(state, action.source);
    case 'call_cabo':
      return callCabo(state);
    case 'swap':
      return swap(state, action.slot);
    case 'discard_drawn':
      return discardDrawn(state);
    case 'power_peek_own':
      return powerPeekOwn(state, action.slot);
    case 'power_peek_other':
      return powerPeekOther(state, action.targetId, action.slot);
    case 'power_blind_swap':
      return powerBlindSwap(state, action.slot, action.targetId, action.targetSlot);
    case 'skip_power':
      return state.phase === 'power' ? endTurn(state) : fail('wrong_phase');
    case 'next_round':
      if (state.phase !== 'round_over') return fail('wrong_phase');
      return ok(dealRound(state.players, state.roundNumber + 1, state.targetScore, shuffledDeck()));
  }
}
