/**
 * Cabo [ID: LOGIC-TABLETOP-SCRIPT-CABO]
 *
 * 52 cards plus two jokers, four face-down cards per seat. At the start of a round every seat
 * looks at its bottom two (slots 2 and 3), one after another. A turn draws from the stock or
 * takes the top discard, or calls Cabo instead. The drawn card is swapped into a slot (the old
 * card goes onto the discard) or, only when drawn from the stock, discarded; a discarded 7/8
 * peeks at one own card, 9/10 at another seat's card, J/Q blind-swaps one own card with another
 * seat's card (optional). After Cabo everyone else plays once more. Points: A 1, 2–10 face value,
 * J 11, Q 12, red K 0, black K 13, joker 0; the caller gets +10 unless strictly lowest. A total
 * of exactly 100 falls back to 50; the match ends when a total passes 100, lowest wins.
 * House rules: no snap discards out of turn; the memory aid of the old game is not offered.
 */
import { shuffled, type Rng } from '../../logic/rng';
import { RANKS_52, isJoker, makeDeck, rankOf, suitOf } from './cardDeck';
import { caboView } from './caboView';
import type { CardId } from './cardDeck';
import type { GameScript, ScriptMove, SlotRef } from './scriptTypes';

export const HAND = 4;
export const TARGET = 100;
export const PENALTY = 10;
export const START_PEEK = [2, 3];

export type CaboPower = 'peekOwn' | 'peekOther' | 'blindSwap';

export interface CaboState {
  totals: number[];
  round: number;
  hands: CardId[][];
  stock: CardId[];
  /** Top card is the last element. */
  discard: CardId[];
  /** `peek`: the seat to act looks at its bottom two cards. */
  phase: 'peek' | 'turn' | 'drawn' | 'power' | 'reveal' | 'roundEnd' | 'matchEnd';
  turn: number;
  /** Seats that already did the start peek. */
  peeked: number;
  drawn: { card: CardId; fromStock: boolean } | null;
  power: CaboPower | null;
  /** Own slot picked for a blind swap. */
  swapFrom: number | null;
  /** Card the seat to act looks at during `reveal`. */
  revealed: SlotRef | null;
  caller: number | null;
  result: { values: number[]; scores: number[]; penalty: boolean; resets: number[] } | null;
}

export function cardValue(card: CardId): number {
  if (isJoker(card)) return 0;
  const rank = rankOf(card);
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return suitOf(card) === 'H' || suitOf(card) === 'D' ? 0 : 13;
  return Number(rank);
}

export function powerOf(card: CardId): CaboPower | null {
  const rank = rankOf(card);
  if (rank === '7' || rank === '8') return 'peekOwn';
  if (rank === '9' || rank === '10') return 'peekOther';
  if (rank === 'J' || rank === 'Q') return 'blindSwap';
  return null;
}

const handValue = (hand: readonly CardId[]) => hand.reduce((sum, c) => sum + cardValue(c), 0);

function deal(totals: number[], round: number, rng: Rng): CaboState {
  const deck = shuffled(makeDeck(RANKS_52, 2), rng);
  const hands = totals.map(() => deck.splice(0, HAND));
  const discard = deck.splice(0, 1);
  return {
    totals,
    round,
    hands,
    stock: deck,
    discard,
    phase: 'peek',
    turn: (round - 1) % totals.length,
    peeked: 0,
    drawn: null,
    power: null,
    swapFrom: null,
    revealed: null,
    caller: null,
    result: null,
  };
}

function finishRound(s: CaboState): CaboState {
  const values = s.hands.map(handValue);
  const c = s.caller;
  const penalty = c !== null && values.some((v, i) => i !== c && v <= values[c]);
  const scores = values.map((v, i) => (i === c && penalty ? v + PENALTY : v));
  const resets: number[] = [];
  const totals = s.totals.map((t, i) => {
    const total = t + scores[i];
    if (total !== TARGET) return total;
    resets.push(i);
    return TARGET / 2;
  });
  const phase = totals.some((t) => t >= TARGET) ? 'matchEnd' : 'roundEnd';
  return {
    ...s,
    totals,
    phase,
    drawn: null,
    power: null,
    revealed: null,
    swapFrom: null,
    result: { values, scores, penalty, resets },
  };
}

function endTurn(s: CaboState): CaboState {
  const next = (s.turn + 1) % s.hands.length;
  if (s.caller !== null && next === s.caller) return finishRound(s);
  return {
    ...s,
    turn: next,
    phase: 'turn',
    drawn: null,
    power: null,
    revealed: null,
    swapFrom: null,
  };
}

function takeFromStock(s: CaboState, rng: Rng): CaboState | null {
  let { stock, discard } = s;
  if (stock.length === 0) {
    if (discard.length <= 1) return null;
    stock = shuffled(discard.slice(0, -1), rng);
    discard = discard.slice(-1);
  }
  const drawn = { card: stock[0], fromStock: true };
  return { ...s, stock: stock.slice(1), discard, drawn, phase: 'drawn' };
}

function onAction(s: CaboState, id: string, rng: Rng): CaboState {
  if (s.phase === 'peek' && id === 'seen') {
    const peeked = s.peeked + 1;
    const turn = (s.turn + 1) % s.hands.length;
    return peeked < s.hands.length ? { ...s, peeked, turn } : { ...s, peeked, turn, phase: 'turn' };
  }
  if (s.phase === 'turn') {
    if (id === 'drawStock') return takeFromStock(s, rng) ?? s;
    if (id === 'takeDiscard' && s.discard.length > 0) {
      const card = s.discard[s.discard.length - 1];
      const drawn = { card, fromStock: false };
      return { ...s, discard: s.discard.slice(0, -1), drawn, phase: 'drawn' };
    }
    if (id === 'cabo' && s.caller === null) return endTurn({ ...s, caller: s.turn });
  }
  if (s.phase === 'drawn' && id === 'discard' && s.drawn?.fromStock) {
    const { card } = s.drawn;
    const next = { ...s, discard: [...s.discard, card], drawn: null };
    const power = powerOf(card);
    return power ? { ...next, phase: 'power', power } : endTurn(next);
  }
  if (s.phase === 'power' && id === 'skip') return endTurn(s);
  if (s.phase === 'reveal' && id === 'endTurn') return endTurn(s);
  return s;
}

function swapIn(s: CaboState, slot: number, card: CardId): CaboState {
  const old = s.hands[s.turn][slot];
  const hands = s.hands.map((h, i) =>
    i === s.turn ? h.map((c, k) => (k === slot ? card : c)) : h,
  );
  return endTurn({ ...s, hands, discard: [...s.discard, old] });
}

function onSlot(s: CaboState, ref: SlotRef): CaboState {
  if (ref.slot < 0 || ref.slot >= HAND || !s.hands[ref.seat]) return s;
  const own = ref.seat === s.turn;
  if (s.phase === 'drawn' && s.drawn && own) return swapIn(s, ref.slot, s.drawn.card);
  if (s.phase !== 'power') return s;
  if (s.power === 'peekOwn' && own) return { ...s, phase: 'reveal', power: null, revealed: ref };
  if (s.power === 'peekOther' && !own) return { ...s, phase: 'reveal', power: null, revealed: ref };
  if (s.power !== 'blindSwap') return s;
  if (own) return { ...s, swapFrom: ref.slot };
  if (s.swapFrom === null) return s;
  const from = s.swapFrom;
  const mine = s.hands[s.turn][from];
  const theirs = s.hands[ref.seat][ref.slot];
  const hands = s.hands.map((h, i) => {
    if (i === s.turn) return h.map((c, k) => (k === from ? theirs : c));
    if (i === ref.seat) return h.map((c, k) => (k === ref.slot ? mine : c));
    return h;
  });
  return endTurn({ ...s, hands });
}

function move(s: CaboState, seat: number, m: ScriptMove, rng: Rng): CaboState {
  if (s.phase === 'roundEnd' || s.phase === 'matchEnd') {
    if (m.kind !== 'action' || m.id !== 'next') return s;
    return s.phase === 'matchEnd'
      ? cabo.start(s.totals.length, rng)
      : deal(s.totals, s.round + 1, rng);
  }
  if (seat !== s.turn) return s;
  if (m.kind === 'slot') return onSlot(s, m);
  return m.kind === 'action' ? onAction(s, m.id, rng) : s;
}

export const cabo: GameScript<CaboState> = {
  id: 'cabo',
  ranks: RANKS_52,
  jokers: 2,
  minPlayers: 2,
  maxPlayers: 6,
  start: (count, rng) => deal(Array<number>(count).fill(0), 1, rng),
  move,
  view: caboView,
};
