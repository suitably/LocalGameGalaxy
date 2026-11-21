/**
 * Schwimmen (Thirty-One, Schnauz) [ID: LOGIC-TABLETOP-SCRIPT-SCHWIMMEN]
 *
 * 32 cards, three in hand, three open in the middle. On your turn: swap one card, swap all
 * three, pass or knock. After a knock everyone else plays once more, then the lowest hand loses
 * a life. 31 (or three aces) ends the round at once. Three lives, then you "swim", then you are out.
 */
import type { Rng } from '../../logic/rng';
import { RANKS_32, SUITS, nextSeat, rankOf, shuffledDeck, sortCards, suitOf } from './cardDeck';
import type { CardId } from './cardDeck';
import {
  emptyView,
  msg,
  type GameScript,
  type ScriptMove,
  type ScriptView,
  type Text,
} from './scriptTypes';

export interface SchwimmenState {
  /** Lives per seat: 3…1, 0 = swimming, -1 = out. */
  lives: number[];
  dealer: number;
  phase: 'dealerChoice' | 'play' | 'roundEnd' | 'matchEnd';
  hands: CardId[][];
  /** The dealer's second pile while they choose. */
  extra: CardId[];
  middle: CardId[];
  stock: CardId[];
  turn: number;
  knocker: number | null;
  /** Passes in a row; when everyone passed, the middle is replaced. */
  passes: number;
  result: { losers: number[]; scores: number[]; fire: number | null } | null;
}

const START_LIVES = 3;
const cardValue = (card: CardId): number => {
  const rank = rankOf(card);
  if (rank === 'A') return 11;
  return ['K', 'Q', 'J'].includes(rank) ? 10 : Number(rank);
};

/** Best sum in one suit; three of a kind 30.5; three aces 33. */
export function schwimmenScore(hand: readonly CardId[]): number {
  if (hand.length === 3 && hand.every((c) => rankOf(c) === rankOf(hand[0]))) {
    return rankOf(hand[0]) === 'A' ? 33 : 30.5;
  }
  return Math.max(
    ...SUITS.map((suit) =>
      hand.filter((c) => suitOf(c) === suit).reduce((sum, c) => sum + cardValue(c), 0),
    ),
  );
}

const alive = (s: SchwimmenState, seat: number) => s.lives[seat] >= 0;
const aliveSeats = (s: SchwimmenState) => s.lives.flatMap((l, i) => (l >= 0 ? [i] : []));

function deal(lives: number[], dealer: number, rng: Rng): SchwimmenState {
  const deck = shuffledDeck(RANKS_32, rng);
  const hands = lives.map((l) => (l >= 0 ? deck.splice(0, 3) : []));
  return {
    lives,
    dealer,
    phase: 'dealerChoice',
    hands,
    extra: deck.splice(0, 3),
    middle: [],
    stock: deck,
    turn: dealer,
    knocker: null,
    passes: 0,
    result: null,
  };
}

function finish(s: SchwimmenState, fire: number | null): SchwimmenState {
  const seats = aliveSeats(s);
  const scores = s.hands.map((h, i) => (alive(s, i) ? schwimmenScore(h) : 0));
  let losers: number[];
  if (fire !== null) losers = seats.filter((i) => i !== fire);
  else {
    const low = Math.min(...seats.map((i) => scores[i]));
    losers = seats.filter((i) => scores[i] === low);
    // Everyone equal: nobody loses.
    if (losers.length === seats.length) losers = [];
  }
  const lives = s.lives.map((l, i) => (losers.includes(i) ? l - 1 : l));
  const left = lives.filter((l) => l >= 0).length;
  return {
    ...s,
    lives,
    phase: left <= 1 ? 'matchEnd' : 'roundEnd',
    result: { losers, scores, fire },
  };
}

/** 31 or three aces in a hand ends the round. */
function fireSeat(s: SchwimmenState, seats: number[]): number | null {
  return seats.find((i) => schwimmenScore(s.hands[i]) >= 31) ?? null;
}

function advance(s: SchwimmenState): SchwimmenState {
  const turn = nextSeat(s.turn, s.lives.length, (i) => alive(s, i));
  if (s.knocker !== null && turn === s.knocker) return finish(s, null);
  return { ...s, turn };
}

function playMove(s: SchwimmenState, seat: number, move: ScriptMove): SchwimmenState {
  if (seat !== s.turn) return s;
  const hand = s.hands[seat];
  const setHand = (cards: CardId[], middle: CardId[]): SchwimmenState => {
    const next = {
      ...s,
      hands: s.hands.map((h, i) => (i === seat ? cards : h)),
      middle,
      passes: 0,
    };
    return fireSeat(next, [seat]) !== null ? finish(next, seat) : advance(next);
  };
  if (move.kind === 'cards') {
    const [card] = move.cards;
    const target = move.target;
    if (move.cards.length !== 1 || !target || !hand.includes(card) || !s.middle.includes(target))
      return s;
    return setHand(
      hand.map((c) => (c === card ? target : c)),
      s.middle.map((c) => (c === target ? card : c)),
    );
  }
  if (move.id === 'swapAll') return setHand(s.middle, hand);
  if (move.id === 'knock') {
    if (s.knocker !== null) return s;
    return advance({ ...s, knocker: seat, passes: 0 });
  }
  if (move.id === 'pass') {
    const passes = s.passes + 1;
    if (passes < aliveSeats(s).length) return advance({ ...s, passes });
    if (s.stock.length < 3) return finish(s, null);
    return advance({ ...s, passes: 0, middle: s.stock.slice(0, 3), stock: s.stock.slice(3) });
  }
  return s;
}

function move(s: SchwimmenState, seat: number, m: ScriptMove, rng: Rng): SchwimmenState {
  if (s.phase === 'play') return playMove(s, seat, m);
  if (m.kind !== 'action') return s;
  if (s.phase === 'dealerChoice') {
    if (seat !== s.dealer || (m.id !== 'keep' && m.id !== 'swap')) return s;
    const keep = m.id === 'keep';
    const next: SchwimmenState = {
      ...s,
      hands: s.hands.map((h, i) => (i === seat && !keep ? s.extra : h)),
      middle: keep ? s.extra : s.hands[seat],
      extra: [],
      phase: 'play',
      turn: nextSeat(s.dealer, s.lives.length, (i) => alive(s, i)),
    };
    const fire = fireSeat(next, aliveSeats(next));
    return fire !== null ? finish(next, fire) : next;
  }
  if (m.id !== 'next') return s;
  if (s.phase === 'matchEnd') return schwimmen.start(s.lives.length, rng);
  return deal(
    s.lives,
    nextSeat(s.dealer, s.lives.length, (i) => alive(s, i)),
    rng,
  );
}

const livesChip = (lives: number): Text => {
  if (lives < 0) return msg('schwimmen.out');
  return lives === 0 ? msg('schwimmen.swimming') : '●'.repeat(lives);
};

function view(s: SchwimmenState, viewer: number | null): ScriptView {
  const v = emptyView(s.lives.length);
  const over = s.phase === 'roundEnd' || s.phase === 'matchEnd';
  v.seats = s.lives.map((lives, i) => ({
    cards: s.hands[i].length,
    chips: [livesChip(lives), ...(s.knocker === i ? [msg('schwimmen.knocked')] : [])],
    out: lives < 0,
  }));
  v.active = over ? [] : [s.turn];
  v.piles = [
    { id: 'middle', kind: 'row', cards: s.middle.map((id) => ({ id })) },
    { id: 'stock', kind: 'stock', cards: [], count: s.stock.length + s.extra.length },
  ];
  if (viewer !== null) v.hand = sortCards(s.hands[viewer], RANKS_32);
  const mine = viewer !== null && viewer === s.turn && !over;

  if (s.phase === 'dealerChoice') {
    v.status = msg('schwimmen.dealerChoice', undefined, s.dealer);
    if (mine)
      v.actions = [
        { id: 'keep', label: msg('schwimmen.keep'), tone: 'primary' },
        { id: 'swap', label: msg('schwimmen.takeOther') },
      ];
  } else if (s.phase === 'play') {
    v.status =
      s.knocker === null
        ? msg('turn', undefined, s.turn)
        : msg('schwimmen.lastTurn', undefined, s.turn);
    if (mine) {
      v.select = 'one';
      v.targets = s.middle;
      v.playLabel = msg('schwimmen.swapOne');
      v.actions = [
        { id: 'swapAll', label: msg('schwimmen.swapAll') },
        { id: 'pass', label: msg('schwimmen.pass') },
        ...(s.knocker === null ? [{ id: 'knock', label: msg('schwimmen.knock') }] : []),
      ];
    }
  } else if (s.result) {
    const { losers, scores, fire } = s.result;
    const winner = s.lives.findIndex((l) => l >= 0);
    v.status = s.phase === 'matchEnd' ? msg('matchWon', undefined, winner) : msg('roundOver');
    v.summary = {
      title: v.status,
      lines: [
        ...(fire !== null ? [msg('schwimmen.fire', undefined, fire)] : []),
        ...(losers.length === 0 ? [msg('schwimmen.tie')] : []),
      ],
      rows: s.hands.flatMap((cards, seat) =>
        cards.length === 0
          ? []
          : [
              {
                seat,
                cards: sortCards(cards, RANKS_32),
                value: String(scores[seat]),
                note: livesChip(s.lives[seat]),
                ...(losers.includes(seat) ? { tone: 'bad' as const } : {}),
              },
            ],
      ),
    };
    v.actions = [
      {
        id: 'next',
        label: msg(s.phase === 'matchEnd' ? 'newMatch' : 'nextRound'),
        tone: 'primary',
      },
    ];
  }
  return v;
}

export const schwimmen: GameScript<SchwimmenState> = {
  id: 'schwimmen',
  ranks: RANKS_32,
  minPlayers: 2,
  maxPlayers: 9,
  start: (count, rng) =>
    deal(Array<number>(count).fill(START_LIVES), Math.floor(rng() * count), rng),
  move,
  view,
};
