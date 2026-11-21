/**
 * Mau-Mau [ID: LOGIC-TABLETOP-SCRIPT-MAUMAU]
 *
 * 32 cards, five in hand, the start card has no effect. Play a card of the top card's suit or
 * rank. 7: the next player draws two (or answers with a 7, then four, …). 8: the next player is
 * skipped. Jack: on anything but a jack, wishes a suit for the next card. Whoever cannot or will
 * not play draws one card and may play only that card, otherwise passes. First empty hand wins
 * the round; the match counts round wins.
 */
import { shuffled, type Rng } from '../../logic/rng';
import {
  RANKS_32,
  SUITS,
  SUIT_SYMBOL,
  cardText,
  rankOf,
  shuffledDeck,
  sortCards,
  suitOf,
} from './cardDeck';
import type { CardId, Suit } from './cardDeck';
import {
  emptyView,
  msg,
  type ActionView,
  type GameScript,
  type ScriptMove,
  type ScriptView,
} from './scriptTypes';

export interface MauMauState {
  /** Round wins per seat. */
  wins: number[];
  round: number;
  /** `drawn`: only the drawn card may be played, or pass. `wish`: the jack's player picks a suit. */
  phase: 'turn' | 'drawn' | 'wish' | 'roundEnd';
  hands: CardId[][];
  stock: CardId[];
  /** Top card is the last element. */
  discard: CardId[];
  turn: number;
  /** Cards the seat to act draws unless it answers with a 7. */
  pendingDraw: number;
  wishedSuit: Suit | null;
  drawn: CardId | null;
  winner: number | null;
}

export const HAND_SIZE = 5;
export const SEVEN_PENALTY = 2;

const topCard = (s: MauMauState): CardId => s.discard[s.discard.length - 1];

/** Whether `card` may go on the discard pile now, ignoring whose turn it is. */
export function fitsOnTop(s: MauMauState, card: CardId): boolean {
  if (s.pendingDraw > 0) return rankOf(card) === '7';
  const top = topCard(s);
  if (rankOf(card) === 'J') return rankOf(top) !== 'J';
  if (s.wishedSuit) return suitOf(card) === s.wishedSuit;
  return suitOf(card) === suitOf(top) || rankOf(card) === rankOf(top);
}

/** Deck plus the discard pile under its top card. */
const drawable = (s: MauMauState): number => s.stock.length + s.discard.length - 1;

function deal(wins: number[], round: number, rng: Rng): MauMauState {
  const deck = shuffledDeck(RANKS_32, rng);
  const hands = wins.map(() => deck.splice(0, HAND_SIZE));
  const top = deck.splice(0, 1);
  return {
    wins,
    round,
    phase: 'turn',
    hands,
    stock: deck,
    discard: top,
    turn: (round - 1) % wins.length,
    pendingDraw: 0,
    wishedSuit: null,
    drawn: null,
    winner: null,
  };
}

/** `count` cards for `seat`; the discard pile under its top card is reshuffled when needed. */
function drawCards(s: MauMauState, seat: number, count: number, rng: Rng) {
  let stock = s.stock;
  let discard = s.discard;
  const drawn: CardId[] = [];
  for (let i = 0; i < count; i++) {
    if (stock.length === 0 && discard.length > 1) {
      stock = shuffled(discard.slice(0, -1), rng);
      discard = discard.slice(-1);
    }
    if (stock.length === 0) break;
    drawn.push(stock[0]);
    stock = stock.slice(1);
  }
  const hands = s.hands.map((h, i) => (i === seat ? [...h, ...drawn] : h));
  return { state: { ...s, hands, stock, discard }, drawn };
}

const advance = (s: MauMauState, steps: number): MauMauState => ({
  ...s,
  phase: 'turn',
  turn: (s.turn + steps) % s.hands.length,
  drawn: null,
});

function play(s: MauMauState, seat: number, card: CardId): MauMauState {
  const hand = s.hands[seat];
  if (!hand.includes(card) || !fitsOnTop(s, card)) return s;
  if (s.phase === 'drawn' && card !== s.drawn) return s;
  const rest = hand.filter((c) => c !== card);
  const next: MauMauState = {
    ...s,
    hands: s.hands.map((h, i) => (i === seat ? rest : h)),
    discard: [...s.discard, card],
    wishedSuit: null,
    drawn: null,
    pendingDraw: rankOf(card) === '7' ? s.pendingDraw + SEVEN_PENALTY : 0,
  };
  if (rest.length === 0) {
    const wins = s.wins.map((w, i) => (i === seat ? w + 1 : w));
    return { ...next, wins, phase: 'roundEnd', winner: seat };
  }
  if (rankOf(card) === 'J') return { ...next, phase: 'wish' };
  return advance(next, rankOf(card) === '8' ? 2 : 1);
}

function action(s: MauMauState, seat: number, id: string, arg: unknown, rng: Rng): MauMauState {
  if (s.phase === 'wish') {
    if (id !== 'wish' || !SUITS.includes(arg as Suit)) return s;
    return advance({ ...s, wishedSuit: arg as Suit }, 1);
  }
  if (id === 'draw' && s.phase === 'turn' && s.pendingDraw === 0 && drawable(s) > 0) {
    const { state, drawn } = drawCards(s, seat, 1, rng);
    return { ...state, phase: 'drawn', drawn: drawn[0] };
  }
  if (id === 'penalty' && s.phase === 'turn' && s.pendingDraw > 0) {
    const { state } = drawCards(s, seat, s.pendingDraw, rng);
    return advance({ ...state, pendingDraw: 0 }, 1);
  }
  const stuck = s.phase === 'turn' && s.pendingDraw === 0 && drawable(s) === 0;
  if (id === 'pass' && (s.phase === 'drawn' || stuck)) return advance(s, 1);
  return s;
}

function move(s: MauMauState, seat: number, m: ScriptMove, rng: Rng): MauMauState {
  if (s.phase === 'roundEnd') {
    return m.kind === 'action' && m.id === 'next' ? deal(s.wins, s.round + 1, rng) : s;
  }
  if (seat !== s.turn) return s;
  if (m.kind === 'action') return action(s, seat, m.id, m.arg, rng);
  if (s.phase === 'wish' || m.cards.length !== 1 || m.target) return s;
  return play(s, seat, m.cards[0]);
}

function turnActions(s: MauMauState): ActionView[] {
  if (s.phase === 'wish') {
    return SUITS.map((suit) => ({ id: 'wish', arg: suit, label: msg(`maumau.suit.${suit}`) }));
  }
  if (s.phase === 'drawn') return [{ id: 'pass', label: msg('maumau.pass') }];
  if (s.pendingDraw > 0) {
    return [{ id: 'penalty', label: msg('maumau.penalty', { count: s.pendingDraw }) }];
  }
  if (drawable(s) === 0) return [{ id: 'pass', label: msg('maumau.pass') }];
  return [{ id: 'draw', label: msg('maumau.draw') }];
}

function view(s: MauMauState, viewer: number | null): ScriptView {
  const v = emptyView(s.hands.length);
  const over = s.phase === 'roundEnd';
  v.seats = s.hands.map((hand, i) => ({
    cards: hand.length,
    chips: [
      msg('maumau.wins', { count: s.wins[i] }),
      ...(hand.length === 1 && !over ? [msg('maumau.mau')] : []),
    ],
  }));
  v.active = over ? [] : [s.turn];
  v.piles = [
    { id: 'discard', kind: 'row', cards: [{ id: topCard(s) }] },
    { id: 'stock', kind: 'stock', cards: [], count: s.stock.length },
  ];
  v.info = [
    ...(s.wishedSuit ? [msg('maumau.wished', { suit: SUIT_SYMBOL[s.wishedSuit] })] : []),
    ...(s.pendingDraw > 0 ? [msg('maumau.pending', { count: s.pendingDraw })] : []),
  ];
  if (viewer !== null) v.hand = sortCards(s.hands[viewer], RANKS_32);

  if (over && s.winner !== null) {
    v.status = msg('maumau.roundWon', undefined, s.winner);
    v.summary = {
      title: v.status,
      lines: [],
      rows: s.hands.map((cards, seat) => ({
        seat,
        cards: sortCards(cards, RANKS_32),
        value: msg('maumau.wins', { count: s.wins[seat] }),
        ...(seat === s.winner ? { tone: 'good' as const } : {}),
      })),
    };
    v.actions = [{ id: 'next', label: msg('nextRound'), tone: 'primary' }];
    return v;
  }

  v.status =
    s.phase === 'wish' ? msg('maumau.wishes', undefined, s.turn) : msg('turn', undefined, s.turn);
  if (viewer !== s.turn) return v;
  if (s.phase === 'drawn' && s.drawn) v.info.push(msg('maumau.drew', { card: cardText(s.drawn) }));
  if (s.phase !== 'wish') {
    v.select = 'one';
    v.playLabel = msg('play');
  }
  v.actions = turnActions(s);
  return v;
}

export const maumau: GameScript<MauMauState> = {
  id: 'maumau',
  ranks: RANKS_32,
  minPlayers: 2,
  maxPlayers: 5,
  start: (count, rng) => deal(Array<number>(count).fill(0), 1, rng),
  move,
  view,
};
