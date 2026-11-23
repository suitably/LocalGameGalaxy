/**
 * Schwarzer Peter (Old Maid) [ID: LOGIC-TABLETOP-SCRIPT-SCHWARZER-PETER]
 *
 * 52 cards without the jack of clubs; the jack of spades is the Schwarzer Peter. Everything is
 * dealt, pairs (same rank and colour) go down at once. On your turn you draw one card blind from
 * the next player who still holds cards (their hand is shuffled first, so a position tells
 * nothing); a pair goes down. Players without cards are out. Whoever holds the Peter at the end
 * loses the round; the match counts those losses.
 */
import { shuffled, type Rng } from '../../logic/rng';
import { RANKS_52, cardText, rankOf, shuffledDeck, sortCards, suitOf } from './cardDeck';
import type { CardId } from './cardDeck';
import { emptyView, msg, type GameScript, type ScriptMove, type ScriptView } from './scriptTypes';

export const PETER: CardId = 'SJ';
const REMOVED: CardId = 'CJ';

export interface SchwarzerPeterState {
  /** Rounds lost per seat. */
  losses: number[];
  round: number;
  hands: CardId[][];
  /** Cards that went down as pairs. */
  pairs: number;
  /** Seat that draws. */
  turn: number;
  /** Seat drawn from. */
  source: number;
  phase: 'draw' | 'drawn' | 'roundEnd';
  drawn: { card: CardId; pair: CardId | null } | null;
  loser: number | null;
}

const isRed = (card: CardId) => suitOf(card) === 'H' || suitOf(card) === 'D';

export function isPair(a: CardId, b: CardId): boolean {
  if (a === b || a === PETER || b === PETER) return false;
  return rankOf(a) === rankOf(b) && isRed(a) === isRed(b);
}

/** A hand without its pairs, in order, and how many cards went down. */
export function withoutPairs(hand: readonly CardId[]): { hand: CardId[]; down: number } {
  const kept: CardId[] = [];
  let down = 0;
  for (const card of hand) {
    const at = kept.findIndex((k) => isPair(k, card));
    if (at >= 0) {
      kept.splice(at, 1);
      down += 2;
    } else kept.push(card);
  }
  return { hand: kept, down };
}

/** Next seat clockwise after `from` that holds cards, or -1. */
function nextHolder(hands: CardId[][], from: number): number {
  for (let k = 1; k < hands.length; k++) {
    const i = (from + k) % hands.length;
    if (hands[i].length > 0) return i;
  }
  return -1;
}

/** The round ends when at most one seat holds cards; else `turn` draws from the next holder. */
function beginTurn(s: SchwarzerPeterState, turn: number, rng: Rng): SchwarzerPeterState {
  const holders = s.hands.flatMap((h, i) => (h.length > 0 ? [i] : []));
  if (holders.length <= 1) {
    const loser = holders[0] ?? null;
    const losses = s.losses.map((l, i) => (i === loser ? l + 1 : l));
    return { ...s, turn, phase: 'roundEnd', drawn: null, loser, losses };
  }
  const source = nextHolder(s.hands, turn);
  const hands = s.hands.map((h, i) => (i === source ? shuffled(h, rng) : h));
  return { ...s, hands, turn, source, phase: 'draw', drawn: null, loser: null };
}

function deal(losses: number[], round: number, rng: Rng): SchwarzerPeterState {
  const deck = shuffledDeck(RANKS_52, rng).filter((c) => c !== REMOVED);
  const dealt: CardId[][] = losses.map(() => []);
  deck.forEach((card, i) => dealt[i % losses.length].push(card));
  const cleaned = dealt.map((h) => withoutPairs(h));
  const state: SchwarzerPeterState = {
    losses,
    round,
    hands: cleaned.map((c) => c.hand),
    pairs: cleaned.reduce((sum, c) => sum + c.down, 0),
    turn: 0,
    source: 0,
    phase: 'draw',
    drawn: null,
    loser: null,
  };
  const start = (round - 1) % losses.length;
  const first = state.hands[start].length > 0 ? start : nextHolder(state.hands, start);
  return beginTurn(state, first < 0 ? start : first, rng);
}

function draw(s: SchwarzerPeterState, slot: number): SchwarzerPeterState {
  const card = s.hands[s.source][slot];
  if (card === undefined) return s;
  const mine = s.hands[s.turn];
  const pair = mine.find((h) => isPair(h, card)) ?? null;
  const hands = s.hands.map((h, i) => {
    if (i === s.source) return h.filter((_, k) => k !== slot);
    if (i === s.turn) return pair ? h.filter((c) => c !== pair) : [...h, card];
    return h;
  });
  return { ...s, hands, pairs: s.pairs + (pair ? 2 : 0), phase: 'drawn', drawn: { card, pair } };
}

function move(s: SchwarzerPeterState, seat: number, m: ScriptMove, rng: Rng): SchwarzerPeterState {
  if (s.phase === 'roundEnd') {
    return m.kind === 'action' && m.id === 'next' ? deal(s.losses, s.round + 1, rng) : s;
  }
  if (seat !== s.turn) return s;
  if (s.phase === 'draw') {
    return m.kind === 'slot' && m.seat === s.source ? draw(s, m.slot) : s;
  }
  if (m.kind !== 'action' || m.id !== 'done') return s;
  const next = nextHolder(s.hands, s.turn);
  return beginTurn(s, next < 0 ? s.turn : next, rng);
}

function view(s: SchwarzerPeterState, viewer: number | null): ScriptView {
  const v = emptyView(s.hands.length);
  const over = s.phase === 'roundEnd';
  v.seats = s.hands.map((hand, i) => ({
    cards: hand.length,
    chips: [
      ...(s.losses[i] > 0 ? [msg('schwarzerPeter.losses', { count: s.losses[i] })] : []),
      ...(hand.length === 0 && !over ? [msg('schwarzerPeter.done')] : []),
    ],
    // The hand to draw from lies face down in front of its owner for everyone else.
    ...(s.phase === 'draw' && i === s.source && viewer !== i
      ? { slots: hand.map(() => null) }
      : {}),
  }));
  v.active = over ? [] : [s.turn];
  v.piles = [
    { id: 'pairs', kind: 'stock', label: msg('schwarzerPeter.pairs'), cards: [], count: s.pairs },
  ];
  if (viewer !== null) v.hand = sortCards(s.hands[viewer]);

  if (over) {
    v.status = s.loser === null ? msg('roundOver') : msg('schwarzerPeter.lost', undefined, s.loser);
    v.summary = {
      title: v.status,
      lines: [],
      rows: s.hands.map((cards, seat) => ({
        seat,
        cards,
        value: msg('schwarzerPeter.losses', { count: s.losses[seat] }),
        ...(seat === s.loser ? { tone: 'bad' as const } : {}),
      })),
    };
    v.actions = [{ id: 'next', label: msg('nextRound'), tone: 'primary' }];
    return v;
  }

  if (s.phase === 'draw') {
    v.status = msg('turn', undefined, s.turn);
    v.info = [msg('schwarzerPeter.drawsFrom', undefined, s.source)];
    if (viewer === s.turn) {
      v.slotTargets = s.hands[s.source].map((_, slot) => ({ seat: s.source, slot }));
    }
    return v;
  }

  v.status = msg('turn', undefined, s.turn);
  if (s.drawn?.pair) v.info = [msg('schwarzerPeter.pairDown', undefined, s.turn)];
  if (viewer === s.turn && s.drawn) {
    v.info = [
      msg(s.drawn.pair ? 'schwarzerPeter.drewPair' : 'schwarzerPeter.drew', {
        card: cardText(s.drawn.card),
      }),
    ];
    v.actions = [{ id: 'done', label: msg('schwarzerPeter.continue'), tone: 'primary' }];
  }
  return v;
}

export const schwarzerPeter: GameScript<SchwarzerPeterState> = {
  id: 'schwarzer-peter',
  ranks: RANKS_52,
  removed: [REMOVED],
  minPlayers: 2,
  maxPlayers: 6,
  start: (count, rng) => deal(Array<number>(count).fill(0), 1, rng),
  move,
  view,
};
