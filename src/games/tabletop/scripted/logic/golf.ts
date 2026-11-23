/**
 * Golf (six-card golf) [ID: LOGIC-TABLETOP-SCRIPT-GOLF]
 *
 * 52 cards plus two jokers, a second deck from five players. Six cards per seat in two rows of
 * three, face down; at the start every seat flips two. A turn draws from the stock or takes the
 * top discard, then swaps it into a slot (the old card goes face up onto the discard) or, when
 * drawn from the stock, discards it and flips a face-down card. Once a seat has all six face
 * up, everyone else plays once more. A=1, 2–10 face value, J/Q=10, K=0, joker −2; equal ranks
 * in one column count 0 (jokers never). Nine holes, lowest total wins, ties share the win.
 * Everything is public: a face-down card is unknown to its owner too.
 */
import { shuffled, type Rng } from '../../logic/rng';
import { RANKS_52, cardText, makeDeck, rankOf, secondDeck } from './cardDeck';
import type { CardId } from './cardDeck';
import {
  emptyView,
  msg,
  type ActionView,
  type GameScript,
  type ScriptMove,
  type ScriptView,
} from './scriptTypes';

export const SLOTS = 6;
export const HOLES = 9;
const START_FLIPS = 2;

export interface GolfState {
  totals: number[];
  hole: number;
  grids: CardId[][];
  up: boolean[][];
  stock: CardId[];
  /** Top card is the last element. */
  discard: CardId[];
  /** `flip`: start flips; `flipAfter`: flip one after discarding the drawn card. */
  phase: 'flip' | 'turn' | 'drawn' | 'flipAfter' | 'holeEnd' | 'matchEnd';
  turn: number;
  startFlips: number;
  drawn: { card: CardId; fromStock: boolean } | null;
  closer: number | null;
  lastTurns: number;
  /** Scores of the hole just finished. */
  scores: number[] | null;
}

export function cardValue(card: CardId): number {
  const rank = rankOf(card);
  if (rank === 'JOKER') return -2;
  if (rank === 'A') return 1;
  if (rank === 'K') return 0;
  if (rank === 'J' || rank === 'Q') return 10;
  return Number(rank);
}

/** Slot i and i+3 form a column; equal ranks there count 0, jokers never pair. */
export function gridScore(grid: readonly CardId[]): number {
  let sum = 0;
  for (let col = 0; col < 3; col++) {
    const [top, bottom] = [grid[col], grid[col + 3]];
    const pair = rankOf(top) === rankOf(bottom) && rankOf(top) !== 'JOKER';
    if (!pair) sum += cardValue(top) + cardValue(bottom);
  }
  return sum;
}

const fullDeck = (players: number): CardId[] => {
  const one = makeDeck(RANKS_52, 2);
  return players <= 4 ? one : [...one, ...secondDeck(one)];
};

function deal(totals: number[], hole: number, rng: Rng): GolfState {
  const deck = shuffled(fullDeck(totals.length), rng);
  const grids = totals.map(() => deck.splice(0, SLOTS));
  const discard = deck.splice(0, 1);
  return {
    totals,
    hole,
    grids,
    up: totals.map(() => Array<boolean>(SLOTS).fill(false)),
    stock: deck,
    discard,
    phase: 'flip',
    turn: (hole - 1) % totals.length,
    startFlips: 0,
    drawn: null,
    closer: null,
    lastTurns: 0,
    scores: null,
  };
}

const setUp = (s: GolfState, seat: number, slot: number): boolean[][] =>
  s.up.map((u, i) => (i === seat ? u.map((f, k) => f || k === slot) : u));

function finishHole(s: GolfState): GolfState {
  const scores = s.grids.map(gridScore);
  const totals = s.totals.map((t, i) => t + scores[i]);
  const up = s.grids.map(() => Array<boolean>(SLOTS).fill(true));
  const phase = s.hole >= HOLES ? 'matchEnd' : 'holeEnd';
  return { ...s, totals, up, scores, phase, drawn: null };
}

/** Starts the last lap when the seat has all cards up, or finishes the hole after it. */
function endTurn(s: GolfState): GolfState {
  let { closer, lastTurns } = s;
  if (closer === null) {
    if (s.up[s.turn].every(Boolean)) {
      closer = s.turn;
      lastTurns = s.grids.length - 1;
    }
  } else lastTurns -= 1;
  const next = { ...s, closer, lastTurns, drawn: null };
  if (closer !== null && lastTurns <= 0) return finishHole(next);
  return { ...next, phase: 'turn', turn: (s.turn + 1) % s.grids.length };
}

function takeFromStock(s: GolfState, rng: Rng): GolfState | null {
  let { stock, discard } = s;
  if (stock.length === 0) {
    if (discard.length <= 1) return null;
    stock = shuffled(discard.slice(0, -1), rng);
    discard = discard.slice(-1);
  }
  return { ...s, stock: stock.slice(1), discard, drawn: { card: stock[0], fromStock: true } };
}

function flipStart(s: GolfState, slot: number): GolfState {
  const up = setUp(s, s.turn, slot);
  if (s.startFlips + 1 < START_FLIPS) return { ...s, up, startFlips: s.startFlips + 1 };
  const turn = (s.turn + 1) % s.grids.length;
  const first = (s.hole - 1) % s.grids.length;
  return { ...s, up, startFlips: 0, turn, phase: turn === first ? 'turn' : 'flip' };
}

function onSlot(s: GolfState, slot: number): GolfState {
  const faceDown = !s.up[s.turn][slot];
  if (s.phase === 'flip' && faceDown) return flipStart(s, slot);
  if (s.phase === 'flipAfter' && faceDown) return endTurn({ ...s, up: setUp(s, s.turn, slot) });
  if (s.phase !== 'drawn' || !s.drawn) return s;
  const { card } = s.drawn;
  const old = s.grids[s.turn][slot];
  const grids = s.grids.map((g, i) =>
    i === s.turn ? g.map((c, k) => (k === slot ? card : c)) : g,
  );
  return endTurn({ ...s, grids, up: setUp(s, s.turn, slot), discard: [...s.discard, old] });
}

function onAction(s: GolfState, id: string, rng: Rng): GolfState {
  if (s.phase === 'turn' && id === 'drawStock') {
    const next = takeFromStock(s, rng);
    return next ? { ...next, phase: 'drawn' } : s;
  }
  if (s.phase === 'turn' && id === 'takeDiscard' && s.discard.length > 0) {
    const card = s.discard[s.discard.length - 1];
    return {
      ...s,
      discard: s.discard.slice(0, -1),
      drawn: { card, fromStock: false },
      phase: 'drawn',
    };
  }
  if (s.phase === 'drawn' && id === 'discard' && s.drawn?.fromStock) {
    const next = { ...s, discard: [...s.discard, s.drawn.card], drawn: null };
    return s.up[s.turn].every(Boolean) ? endTurn(next) : { ...next, phase: 'flipAfter' };
  }
  return s;
}

function move(s: GolfState, seat: number, m: ScriptMove, rng: Rng): GolfState {
  if (s.phase === 'holeEnd' || s.phase === 'matchEnd') {
    if (m.kind !== 'action' || m.id !== 'next') return s;
    if (s.phase === 'matchEnd') return golf.start(s.totals.length, rng);
    return deal(s.totals, s.hole + 1, rng);
  }
  if (seat !== s.turn) return s;
  if (m.kind === 'slot') {
    return m.seat === seat && m.slot >= 0 && m.slot < SLOTS ? onSlot(s, m.slot) : s;
  }
  return m.kind === 'action' ? onAction(s, m.id, rng) : s;
}

function turnView(s: GolfState, v: ScriptView, mine: boolean): void {
  const own = (open: boolean | null) =>
    s.up[s.turn].flatMap((u, slot) =>
      open === null || u === open ? [{ seat: s.turn, slot }] : [],
    );
  const actions: ActionView[] = [];
  if (s.phase === 'flip') {
    v.status = msg('golf.flipStart', { count: START_FLIPS - s.startFlips }, s.turn);
    if (mine) v.slotTargets = own(false);
  } else if (s.phase === 'turn') {
    v.status = msg('turn', undefined, s.turn);
    actions.push({ id: 'drawStock', label: msg('golf.drawStock'), tone: 'primary' });
    if (s.discard.length > 0) actions.push({ id: 'takeDiscard', label: msg('golf.takeDiscard') });
  } else if (s.phase === 'drawn' && s.drawn) {
    v.status = msg('golf.place', { card: cardText(s.drawn.card) }, s.turn);
    if (mine) v.slotTargets = own(null);
    if (s.drawn.fromStock) actions.push({ id: 'discard', label: msg('golf.discard') });
  } else if (s.phase === 'flipAfter') {
    v.status = msg('golf.flipOne', undefined, s.turn);
    if (mine) v.slotTargets = own(false);
  }
  if (mine) v.actions = actions;
}

function view(s: GolfState, viewer: number | null): ScriptView {
  const v = emptyView(s.grids.length);
  const over = s.phase === 'holeEnd' || s.phase === 'matchEnd';
  v.seats = s.grids.map((grid, i) => ({
    cards: 0,
    chips: [msg('golf.total', { points: s.totals[i] })],
    slots: grid.map((card, k) => (s.up[i][k] ? card : null)),
    slotColumns: 3,
  }));
  v.active = over ? [] : [s.turn];
  v.info = [
    msg('golf.hole', { hole: s.hole, holes: HOLES }),
    ...(s.closer !== null && !over ? [msg('golf.lastLap', undefined, s.closer)] : []),
  ];
  v.piles = [
    { id: 'stock', kind: 'stock', cards: [], count: s.stock.length },
    { id: 'discard', kind: 'row', cards: s.discard.slice(-1).map((id) => ({ id })) },
    ...(s.drawn
      ? [
          {
            id: 'drawn',
            kind: 'row' as const,
            label: msg('golf.drawn'),
            cards: [{ id: s.drawn.card }],
          },
        ]
      : []),
  ];
  if (!over) {
    turnView(s, v, viewer === s.turn);
    return v;
  }
  const best = Math.min(...s.totals);
  v.status =
    s.phase === 'matchEnd'
      ? msg('golf.won', undefined, s.totals.indexOf(best))
      : msg('golf.holeOver', { hole: s.hole });
  v.summary = {
    title: v.status,
    lines: [],
    rows: s.grids.map((cards, seat) => ({
      seat,
      cards,
      value: String(s.scores?.[seat] ?? 0),
      note: msg('golf.total', { points: s.totals[seat] }),
      ...(s.phase === 'matchEnd' && s.totals[seat] === best ? { tone: 'good' as const } : {}),
    })),
  };
  const last = s.phase === 'matchEnd';
  v.actions = [{ id: 'next', label: msg(last ? 'newMatch' : 'golf.nextHole'), tone: 'primary' }];
  return v;
}

export const golf: GameScript<GolfState> = {
  id: 'golf',
  ranks: RANKS_52,
  jokers: 2,
  minPlayers: 2,
  maxPlayers: 6,
  start: (count, rng) => deal(Array<number>(count).fill(0), 1, rng),
  move,
  view,
};
