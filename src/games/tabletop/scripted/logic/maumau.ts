/**
 * Mau-Mau [ID: LOGIC-TABLETOP-SCRIPT-MAUMAU]
 *
 * 32 cards, five in hand, the start card has no effect. Play a card of the top card's suit or
 * rank. 7: the next player draws two (or answers with a 7, then four, …). 8: the next player is
 * skipped. Jack: on anything but a jack, wishes a suit for the next card. Whoever cannot or will
 * not play draws one card and may play only that card, otherwise passes. First empty hand wins
 * the round; the match counts round wins.
 * Table settings (#799): `eightSkips` (on) — 8 skips the next seat; `eightCounter` — the skipped
 * seat may answer with an 8 and pass the skip on; `drawPlay` (on) — a drawn card may be played at
 * once, otherwise drawing ends the turn; `playOn` (on) — after the first empty hand the table may
 * play on for the ranking.
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
  type ScriptOption,
  type ScriptOptions,
  type ScriptView,
  optionOn,
} from './scriptTypes';

export type MauMauRules = {
  eightSkips: boolean;
  eightCounter: boolean;
  drawPlay: boolean;
  playOn: boolean;
};

const OPTIONS: readonly ScriptOption[] = [
  {
    id: 'eightSkips',
    label: 'maumau.option.eightSkips',
    hint: 'maumau.option.eightSkipsHint',
    default: true,
  },
  {
    id: 'eightCounter',
    label: 'maumau.option.eightCounter',
    hint: 'maumau.option.eightCounterHint',
  },
  {
    id: 'drawPlay',
    label: 'maumau.option.drawPlay',
    hint: 'maumau.option.drawPlayHint',
    default: true,
  },
  { id: 'playOn', label: 'maumau.option.playOn', hint: 'maumau.option.playOnHint', default: true },
];

export const rulesOf = (options?: ScriptOptions): MauMauRules => ({
  eightSkips: optionOn(OPTIONS, options, 'eightSkips'),
  eightCounter: optionOn(OPTIONS, options, 'eightCounter'),
  drawPlay: optionOn(OPTIONS, options, 'drawPlay'),
  playOn: optionOn(OPTIONS, options, 'playOn'),
});

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
  /** First empty hand of the round. */
  winner: number | null;
  /** Missing in sessions saved before the table settings existed: the defaults. */
  rules?: MauMauRules;
  /** The seat to act was hit by an 8 and may answer with an 8 (rule `eightCounter`). */
  pendingSkip?: boolean;
  /** Seats that emptied their hand this round, in order (the ranking). */
  finished?: number[];
}

export const HAND_SIZE = 5;
export const SEVEN_PENALTY = 2;

const topCard = (s: MauMauState): CardId => s.discard[s.discard.length - 1];

/** Whether `card` may go on the discard pile now, ignoring whose turn it is. */
export function fitsOnTop(s: MauMauState, card: CardId): boolean {
  if (s.pendingDraw > 0) return rankOf(card) === '7';
  if (s.pendingSkip) return rankOf(card) === '8';
  const top = topCard(s);
  if (rankOf(card) === 'J') return rankOf(top) !== 'J';
  if (s.wishedSuit) return suitOf(card) === s.wishedSuit;
  return suitOf(card) === suitOf(top) || rankOf(card) === rankOf(top);
}

/** Deck plus the discard pile under its top card. */
const drawable = (s: MauMauState): number => s.stock.length + s.discard.length - 1;

const rulesIn = (s: MauMauState): MauMauRules => s.rules ?? rulesOf();
const withCards = (s: MauMauState): number[] =>
  s.hands.flatMap((h, i) => (h.length > 0 ? [i] : []));
/** Round over and the table may play on for the ranking. */
export const canPlayOn = (s: MauMauState): boolean =>
  s.phase === 'roundEnd' && rulesIn(s).playOn && withCards(s).length >= 2;

function deal(wins: number[], round: number, rng: Rng, rules: MauMauRules): MauMauState {
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
    rules,
    pendingSkip: false,
    finished: [],
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

/** `steps` seats on, skipping seats that already emptied their hand. */
function advance(s: MauMauState, steps: number): MauMauState {
  const n = s.hands.length;
  let turn = s.turn;
  for (let k = 0; k < steps; k++) {
    for (let d = 1; d <= n; d++) {
      const seat = (turn + d) % n;
      if (s.hands[seat].length > 0) {
        turn = seat;
        break;
      }
    }
  }
  return { ...s, phase: 'turn', turn, drawn: null };
}

/** The table after `card` went down: the 7 and 8 take effect on the next seat. */
function afterCard(s: MauMauState, card: CardId): MauMauState {
  const rules = rulesIn(s);
  if (rankOf(card) !== '8' || !rules.eightSkips) return advance(s, 1);
  if (rules.eightCounter) return advance({ ...s, pendingSkip: true }, 1);
  return advance(s, 2);
}

/** `seat` emptied its hand: first place wins the round; with `playOn` the rest may go on. */
function finishSeat(s: MauMauState, seat: number, card: CardId): MauMauState {
  const finished = [...(s.finished ?? []), seat];
  const first = finished.length === 1;
  const wins = first ? s.wins.map((w, i) => (i === seat ? w + 1 : w)) : s.wins;
  const next: MauMauState = { ...s, wins, finished, winner: first ? seat : s.winner };
  const left = withCards(next).length;
  if (left >= 2 && !first) return afterCard(next, card);
  if (left < 2 || !rulesIn(s).playOn) return { ...next, phase: 'roundEnd', pendingSkip: false };
  // Paused: `continue` resumes with the next seat already set.
  return { ...afterCard(next, card), phase: 'roundEnd' };
}

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
    pendingSkip: false,
  };
  if (rest.length === 0) return finishSeat(next, seat, card);
  if (rankOf(card) === 'J') return { ...next, phase: 'wish' };
  return afterCard(next, card);
}

function action(s: MauMauState, seat: number, id: string, arg: unknown, rng: Rng): MauMauState {
  if (s.phase === 'wish') {
    if (id !== 'wish' || !SUITS.includes(arg as Suit)) return s;
    return advance({ ...s, wishedSuit: arg as Suit }, 1);
  }
  if (id === 'skip' && s.phase === 'turn' && s.pendingSkip) {
    return advance({ ...s, pendingSkip: false }, 1);
  }
  const free = s.phase === 'turn' && s.pendingDraw === 0 && !s.pendingSkip;
  if (id === 'draw' && free && drawable(s) > 0) {
    const { state, drawn } = drawCards(s, seat, 1, rng);
    if (!rulesIn(s).drawPlay) return advance(state, 1);
    return { ...state, phase: 'drawn', drawn: drawn[0] };
  }
  if (id === 'penalty' && s.phase === 'turn' && s.pendingDraw > 0) {
    const { state } = drawCards(s, seat, s.pendingDraw, rng);
    return advance({ ...state, pendingDraw: 0 }, 1);
  }
  const stuck = free && drawable(s) === 0;
  if (id === 'pass' && (s.phase === 'drawn' || stuck)) return advance(s, 1);
  return s;
}

function move(s: MauMauState, seat: number, m: ScriptMove, rng: Rng): MauMauState {
  if (s.phase === 'roundEnd') {
    if (m.kind !== 'action') return s;
    if (m.id === 'continue' && canPlayOn(s)) return { ...s, phase: 'turn' };
    return m.id === 'next' ? deal(s.wins, s.round + 1, rng, rulesIn(s)) : s;
  }
  if (seat !== s.turn || m.kind === 'slot') return s;
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
  if (s.pendingSkip) return [{ id: 'skip', label: msg('maumau.skip') }];
  if (drawable(s) === 0) return [{ id: 'pass', label: msg('maumau.pass') }];
  return [{ id: 'draw', label: msg('maumau.draw') }];
}

function view(s: MauMauState, viewer: number | null): ScriptView {
  const v = emptyView(s.hands.length);
  const over = s.phase === 'roundEnd';
  const finished = s.finished ?? [];
  const place = (seat: number) => finished.indexOf(seat) + 1;
  v.seats = s.hands.map((hand, i) => ({
    cards: hand.length,
    chips: [
      msg('maumau.wins', { count: s.wins[i] }),
      ...(place(i) > 0 ? [msg('maumau.place', { place: place(i) })] : []),
      ...(hand.length === 1 && !over ? [msg('maumau.mau')] : []),
    ],
    out: !over && hand.length === 0,
  }));
  v.active = over ? [] : [s.turn];
  v.piles = [
    { id: 'discard', kind: 'row', cards: [{ id: topCard(s) }] },
    { id: 'stock', kind: 'stock', cards: [], count: s.stock.length },
  ];
  v.info = [
    ...(s.wishedSuit ? [msg('maumau.wished', { suit: SUIT_SYMBOL[s.wishedSuit] })] : []),
    ...(s.pendingDraw > 0 ? [msg('maumau.pending', { count: s.pendingDraw })] : []),
    ...(s.pendingSkip ? [msg('maumau.skipPending')] : []),
  ];
  if (viewer !== null) v.hand = sortCards(s.hands[viewer], RANKS_32);

  if (over && s.winner !== null) {
    const playOn = canPlayOn(s);
    // Without playing on, the last one holding cards takes the last place.
    const left = withCards(s);
    const ranking = playOn || left.length !== 1 ? finished : [...finished, ...left];
    v.status = msg('maumau.roundWon', undefined, s.winner);
    v.summary = {
      title: v.status,
      lines: playOn ? [msg('maumau.playOnAsk')] : [],
      rows: s.hands.map((cards, seat) => {
        const rank = ranking.indexOf(seat) + 1;
        return {
          seat,
          cards: sortCards(cards, RANKS_32),
          value:
            rank > 0
              ? msg('maumau.place', { place: rank })
              : msg('maumau.cards', { count: cards.length }),
          note: msg('maumau.wins', { count: s.wins[seat] }),
          ...(seat === s.winner ? { tone: 'good' as const } : {}),
        };
      }),
    };
    v.actions = [
      ...(playOn
        ? [{ id: 'continue', label: msg('maumau.playOn'), tone: 'primary' as const }]
        : []),
      { id: 'next', label: msg('nextRound'), ...(playOn ? {} : { tone: 'primary' as const }) },
    ];
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
  options: OPTIONS,
  start: (count, rng, options) => deal(Array<number>(count).fill(0), 1, rng, rulesOf(options)),
  configure: (s, options) => ({ ...s, rules: rulesOf(options) }),
  move,
  view,
};
