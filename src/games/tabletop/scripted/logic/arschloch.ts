/**
 * Arschloch (President) [ID: LOGIC-TABLETOP-SCRIPT-ARSCHLOCH]
 *
 * All cards are dealt (32 up to four players, 52 above). The leader plays one or more cards of
 * one rank; the others play as many cards of a higher rank or pass for the rest of the trick.
 * Whoever played last leads next. First out is the president, last the Arschloch; before the
 * next round the losers hand their best cards to the winners, who give back cards they choose.
 */
import type { Rng } from '../../logic/rng';
import {
  RANKS_32,
  RANKS_52,
  holdsAll,
  nextSeat,
  rankIndex,
  rankOf,
  shuffledDeck,
  sortCards,
  without,
} from './cardDeck';
import type { CardId } from './cardDeck';
import {
  emptyView,
  msg,
  type GameScript,
  type Msg,
  type ScriptMove,
  type ScriptView,
} from './scriptTypes';

interface Exchange {
  from: number;
  to: number;
  count: number;
}

export interface ArschlochState {
  ranks: readonly string[];
  hands: CardId[][];
  turn: number;
  /** Plays of the current trick; kept on the table until the next lead. */
  pile: { seat: number; cards: CardId[] }[];
  /** What has to be beaten; `null`: `turn` leads. */
  top: { rank: number; count: number; seat: number } | null;
  passed: number[];
  /** Seats in the order they went out this round. */
  finished: number[];
  /** Finishing order of the previous round. */
  order: number[] | null;
  phase: 'exchange' | 'play' | 'roundEnd';
  /** Cards the winners still have to give back. */
  exchange: Exchange[];
  scores: number[];
}

const ranksFor = (count: number) => (count <= 4 ? RANKS_32 : RANKS_52);
const hasCards = (s: ArschlochState, seat: number) => s.hands[seat].length > 0;

function deal(count: number, rng: Rng, scores: number[], order: number[] | null): ArschlochState {
  const ranks = ranksFor(count);
  const deck = shuffledDeck(ranks, rng);
  const hands: CardId[][] = Array.from({ length: count }, () => []);
  // The Arschloch gets the first card (and so an extra one when they do not divide evenly).
  const first = order ? order[count - 1] : 0;
  deck.forEach((card, i) => hands[(first + i) % count].push(card));
  const base: ArschlochState = {
    ranks,
    hands,
    turn: first,
    pile: [],
    top: null,
    passed: [],
    finished: [],
    order,
    phase: 'play',
    exchange: [],
    scores,
  };
  if (!order) return base;
  // Losers hand over their best cards at once; the winners then choose what to return.
  const swaps: Exchange[] = [{ from: order[0], to: order[count - 1], count: count >= 4 ? 2 : 1 }];
  if (count >= 4) swaps.push({ from: order[1], to: order[count - 2], count: 1 });
  for (const swap of swaps) {
    const best = [...hands[swap.to]]
      .sort((a, b) => rankIndex(b, ranks) - rankIndex(a, ranks))
      .slice(0, swap.count);
    hands[swap.to] = without(hands[swap.to], best);
    hands[swap.from].push(...best);
  }
  return { ...base, phase: 'exchange', exchange: swaps, turn: swaps[0].from };
}

function finishRound(s: ArschlochState): ArschlochState {
  const count = s.hands.length;
  const last = s.hands.findIndex((h) => h.length > 0);
  const finished = last < 0 ? s.finished : [...s.finished, last];
  return {
    ...s,
    finished,
    phase: 'roundEnd',
    scores: s.scores.map((score, seat) => score + count - 1 - finished.indexOf(seat)),
  };
}

/** Next seat that may still beat `top`; back at the seat that played it, the trick is over. */
function advance(s: ArschlochState): ArschlochState {
  if (s.hands.filter((h) => h.length > 0).length <= 1) return finishRound(s);
  const count = s.hands.length;
  const top = s.top!;
  for (let k = 1; k <= count; k++) {
    const seat = (s.turn + k) % count;
    if (seat === top.seat) break;
    if (hasCards(s, seat) && !s.passed.includes(seat)) return { ...s, turn: seat };
  }
  const lead = hasCards(s, top.seat) ? top.seat : nextSeat(top.seat, count, (i) => hasCards(s, i));
  return { ...s, turn: lead, top: null, passed: [] };
}

function play(s: ArschlochState, seat: number, m: ScriptMove): ArschlochState {
  if (seat !== s.turn) return s;
  if (m.kind === 'action') {
    if (m.id !== 'pass' || !s.top) return s;
    return advance({ ...s, passed: [...s.passed, seat] });
  }
  const { cards } = m;
  if (cards.length === 0 || !holdsAll(s.hands[seat], cards)) return s;
  if (!cards.every((c) => rankOf(c) === rankOf(cards[0]))) return s;
  const rank = rankIndex(cards[0], s.ranks);
  if (s.top && (cards.length !== s.top.count || rank <= s.top.rank)) return s;
  const hands = s.hands.map((h, i) => (i === seat ? without(h, cards) : h));
  return advance({
    ...s,
    hands,
    pile: [...(s.top ? s.pile : []), { seat, cards }],
    top: { rank, count: cards.length, seat },
    finished: hands[seat].length === 0 ? [...s.finished, seat] : s.finished,
  });
}

function giveBack(s: ArschlochState, seat: number, m: ScriptMove): ArschlochState {
  const [swap, ...rest] = s.exchange;
  if (m.kind !== 'cards' || seat !== swap.from) return s;
  if (m.cards.length !== swap.count || !holdsAll(s.hands[seat], m.cards)) return s;
  const hands = s.hands.map((h, i) => {
    if (i === swap.from) return without(h, m.cards);
    return i === swap.to ? [...h, ...m.cards] : h;
  });
  if (rest.length > 0) return { ...s, hands, exchange: rest, turn: rest[0].from };
  // The Arschloch leads the round.
  return { ...s, hands, exchange: [], phase: 'play', turn: s.order![s.hands.length - 1] };
}

function move(s: ArschlochState, seat: number, m: ScriptMove, rng: Rng): ArschlochState {
  if (s.phase === 'play') return play(s, seat, m);
  if (s.phase === 'exchange') return giveBack(s, seat, m);
  if (m.kind !== 'action' || m.id !== 'next') return s;
  return deal(s.hands.length, rng, s.scores, s.finished);
}

/** Title for place `index` of `count`: president, vice, citizen, vice-Arschloch, Arschloch. */
export function titleOf(index: number, count: number): Msg {
  if (index === 0) return msg('arschloch.president');
  if (index === count - 1) return msg('arschloch.arschloch');
  if (count >= 4 && index === 1) return msg('arschloch.vicePresident');
  if (count >= 4 && index === count - 2) return msg('arschloch.viceArschloch');
  return msg('arschloch.citizen');
}

function view(s: ArschlochState, viewer: number | null): ScriptView {
  const count = s.hands.length;
  const v = emptyView(count);
  const over = s.phase === 'roundEnd';
  v.seats = s.hands.map((hand, seat) => {
    const place = s.finished.indexOf(seat);
    const before = s.order ? s.order.indexOf(seat) : -1;
    return {
      cards: hand.length,
      chips: [
        ...(place >= 0 ? [titleOf(place, count)] : before >= 0 ? [titleOf(before, count)] : []),
        ...(s.passed.includes(seat) ? [msg('arschloch.passed')] : []),
        String(s.scores[seat]),
      ],
      out: !over && place >= 0,
    };
  });
  v.active = over ? [] : [s.turn];
  v.piles = [
    {
      id: 'pile',
      kind: 'row',
      cards: (s.pile[s.pile.length - 1]?.cards ?? []).map((id) => ({
        id,
        seat: s.pile[s.pile.length - 1].seat,
      })),
    },
  ];
  if (viewer !== null)
    v.hand = sortCards(s.hands[viewer], s.ranks).sort(
      (a, b) => rankIndex(a, s.ranks) - rankIndex(b, s.ranks),
    );
  const mine = viewer === s.turn;

  if (over) {
    v.status = msg('arschloch.roundWon', undefined, s.finished[0]);
    v.summary = {
      title: msg('roundOver'),
      lines: [],
      rows: s.finished.map((seat, place) => ({
        seat,
        value: String(s.scores[seat]),
        note: titleOf(place, count),
        ...(place === 0 ? { tone: 'good' as const } : {}),
        ...(place === count - 1 ? { tone: 'bad' as const } : {}),
      })),
    };
    v.actions = [{ id: 'next', label: msg('nextRound'), tone: 'primary' }];
  } else if (s.phase === 'exchange') {
    const swap = s.exchange[0];
    v.status = msg('arschloch.gives', { count: swap.count }, swap.from);
    if (mine) {
      v.select = 'many';
      v.playLabel = msg('arschloch.give', { count: swap.count });
    }
  } else {
    v.status = msg(s.top ? 'turn' : 'arschloch.leads', undefined, s.turn);
    if (mine) {
      v.select = 'many';
      v.playLabel = msg('play');
      if (s.top) v.actions = [{ id: 'pass', label: msg('arschloch.pass') }];
    }
  }
  return v;
}

export const arschloch: GameScript<ArschlochState> = {
  id: 'arschloch',
  minPlayers: 3,
  maxPlayers: 8,
  start: (count, rng) => deal(count, rng, Array<number>(count).fill(0), null),
  move,
  view,
};
