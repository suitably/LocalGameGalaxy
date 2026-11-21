/**
 * Durak (Podkidnoy, throw-in) [ID: LOGIC-TABLETOP-SCRIPT-DURAK]
 *
 * 36 cards, six in hand, the bottom card of the stock shows trumps. The attacker plays, the
 * defender beats each card with a higher one of its suit or a trump, or takes everything. The
 * other players may add cards of ranks already on the table. Whoever is left with cards at the
 * end is the durak.
 */
import type { Rng } from '../../logic/rng';
import {
  RANKS_36,
  SUITS,
  SUIT_SYMBOL,
  holdsAll,
  nextSeat,
  rankIndex,
  rankOf,
  shuffledDeck,
  sortCards,
  suitOf,
  without,
} from './cardDeck';
import type { CardId, Suit } from './cardDeck';
import { emptyView, msg, type GameScript, type ScriptMove, type ScriptView } from './scriptTypes';

const HAND_SIZE = 6;

export interface DurakPair {
  attack: CardId;
  defense: CardId | null;
}

export interface DurakState {
  hands: CardId[][];
  /** Drawn from the front; the last card is the open trump card. */
  stock: CardId[];
  trump: Suit;
  table: DurakPair[];
  attacker: number;
  defender: number;
  turn: number;
  /** Attackers who have nothing more to add to this bout. */
  passed: number[];
  /** Most attack cards in this bout. */
  limit: number;
  phase: 'play' | 'roundEnd';
  /** Loser of the round; `null` when the last cards went out together. */
  durak: number | null;
  losses: number[];
  last: 'beaten' | 'taken' | null;
}

export function beats(card: CardId, attack: CardId, trump: Suit): boolean {
  if (suitOf(card) === suitOf(attack))
    return rankIndex(card, RANKS_36) > rankIndex(attack, RANKS_36);
  return suitOf(card) === trump;
}

const hasCards = (s: DurakState, seat: number) => s.hands[seat].length > 0;
const tableRanks = (s: DurakState) =>
  s.table.flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])]).map(rankOf);
const openAttacks = (s: DurakState) => s.table.filter((p) => !p.defense).map((p) => p.attack);

/** Attackers in asking order: the main attacker, then clockwise, never the defender. */
function attackers(s: DurakState): number[] {
  const n = s.hands.length;
  return Array.from({ length: n }, (_, k) => (s.attacker + k) % n).filter(
    (seat) => seat !== s.defender && hasCards(s, seat),
  );
}

const canAdd = (s: DurakState, seat: number): boolean =>
  s.table.length < s.limit && s.hands[seat].some((c) => tableRanks(s).includes(rankOf(c)));

function startBout(s: DurakState, attacker: number): DurakState {
  const n = s.hands.length;
  const left = s.hands.filter((h) => h.length > 0).length;
  if (left <= 1) {
    const durak = s.hands.findIndex((h) => h.length > 0);
    return {
      ...s,
      table: [],
      phase: 'roundEnd',
      durak: durak < 0 ? null : durak,
      losses: s.losses.map((l, i) => (i === durak ? l + 1 : l)),
    };
  }
  const from = hasCards(s, attacker) ? attacker : nextSeat(attacker, n, (i) => hasCards(s, i));
  const defender = nextSeat(from, n, (i) => hasCards(s, i));
  return {
    ...s,
    table: [],
    attacker: from,
    defender,
    turn: from,
    passed: [],
    limit: Math.min(HAND_SIZE, s.hands[defender].length),
  };
}

/** Everyone draws up to six: attackers first, the defender last. */
function refill(s: DurakState): DurakState {
  const n = s.hands.length;
  const order = [
    ...Array.from({ length: n }, (_, k) => (s.attacker + k) % n).filter((i) => i !== s.defender),
    s.defender,
  ];
  const stock = [...s.stock];
  const hands = s.hands.map((h) => [...h]);
  for (const seat of order) {
    while (hands[seat].length < HAND_SIZE && stock.length > 0) hands[seat].push(stock.shift()!);
  }
  return { ...s, hands, stock };
}

function endBout(s: DurakState, taken: boolean): DurakState {
  const cards = s.table.flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])]);
  const hands = taken ? s.hands.map((h, i) => (i === s.defender ? [...h, ...cards] : h)) : s.hands;
  const next = refill({ ...s, hands, table: [], last: taken ? 'taken' : 'beaten' });
  const n = s.hands.length;
  return startBout(next, taken ? (s.defender + 1) % n : s.defender);
}

/** After a full defence: the next attacker who may still add, or the bout is beaten. */
function askAttackers(s: DurakState): DurakState {
  if (!hasCards(s, s.defender)) return endBout(s, false);
  const seat = attackers(s).find((a) => !s.passed.includes(a) && canAdd(s, a));
  return seat === undefined ? endBout(s, false) : { ...s, turn: seat };
}

function attack(s: DurakState, seat: number, cards: CardId[]): DurakState {
  if (cards.length === 0 || !holdsAll(s.hands[seat], cards)) return s;
  const ranks = s.table.length === 0 ? [rankOf(cards[0])] : tableRanks(s);
  if (s.table.length === 0 && seat !== s.attacker) return s;
  if (!cards.every((c) => ranks.includes(rankOf(c)))) return s;
  if (s.table.length + cards.length > s.limit) return s;
  return {
    ...s,
    hands: s.hands.map((h, i) => (i === seat ? without(h, cards) : h)),
    table: [...s.table, ...cards.map((c) => ({ attack: c, defense: null }))],
    turn: s.defender,
    passed: [],
    last: null,
  };
}

function defend(s: DurakState, cards: CardId[], target?: CardId): DurakState {
  const open = openAttacks(s);
  const [card] = cards;
  const aim = target ?? (open.length === 1 ? open[0] : undefined);
  if (cards.length !== 1 || !aim || !open.includes(aim)) return s;
  if (!s.hands[s.defender].includes(card) || !beats(card, aim, s.trump)) return s;
  const next: DurakState = {
    ...s,
    hands: s.hands.map((h, i) => (i === s.defender ? without(h, [card]) : h)),
    table: s.table.map((p) => (p.attack === aim ? { ...p, defense: card } : p)),
  };
  return openAttacks(next).length > 0 ? next : askAttackers(next);
}

function move(s: DurakState, seat: number, m: ScriptMove, rng: Rng): DurakState {
  if (s.phase === 'roundEnd') {
    if (m.kind !== 'action' || m.id !== 'next') return s;
    return deal(s.hands.length, rng, s.losses, s.durak);
  }
  if (seat !== s.turn) return s;
  if (seat === s.defender) {
    if (m.kind === 'cards') return defend(s, m.cards, m.target);
    return m.id === 'take' ? endBout(s, true) : s;
  }
  if (m.kind === 'cards') return attack(s, seat, m.cards);
  if (m.id !== 'pass' || s.table.length === 0) return s;
  return askAttackers({ ...s, passed: [...s.passed, seat] });
}

function deal(count: number, rng: Rng, losses: number[], lastDurak: number | null): DurakState {
  const deck = shuffledDeck(RANKS_36, rng);
  const trump = suitOf(deck[deck.length - 1]);
  const hands = Array.from({ length: count }, () => deck.splice(0, HAND_SIZE));
  // The durak is attacked first; in the first round the lowest trump attacks.
  let attacker = lastDurak === null ? 0 : (lastDurak + count - 1) % count;
  if (lastDurak === null) {
    let low = Infinity;
    hands.forEach((hand, seat) => {
      for (const c of hand) {
        if (suitOf(c) === trump && rankIndex(c, RANKS_36) < low) {
          low = rankIndex(c, RANKS_36);
          attacker = seat;
        }
      }
    });
  }
  return startBout(
    {
      hands,
      stock: deck,
      trump,
      table: [],
      attacker,
      defender: attacker,
      turn: attacker,
      passed: [],
      limit: HAND_SIZE,
      phase: 'play',
      durak: null,
      losses,
      last: null,
    },
    attacker,
  );
}

function view(s: DurakState, viewer: number | null): ScriptView {
  const v = emptyView(s.hands.length);
  const over = s.phase === 'roundEnd';
  const suitOrder = [...SUITS.filter((x) => x !== s.trump), s.trump];
  v.info = [msg('trump', { suit: SUIT_SYMBOL[s.trump] })];
  v.seats = s.hands.map((hand, i) => ({
    cards: hand.length,
    chips: [
      ...(!over && i === s.attacker ? [msg('durak.attacker')] : []),
      ...(!over && i === s.defender ? [msg('durak.defender')] : []),
      ...(s.losses[i] > 0 ? [msg('durak.losses', { count: s.losses[i] })] : []),
    ],
    out: !over && hand.length === 0,
  }));
  v.active = over ? [] : [s.turn];
  const trumpCard = s.stock[s.stock.length - 1];
  v.piles = [
    {
      id: 'table',
      kind: 'row',
      cards: s.table.map((p) => ({ id: p.attack, ...(p.defense ? { cover: p.defense } : {}) })),
    },
    {
      id: 'stock',
      kind: 'stock',
      cards: trumpCard ? [{ id: trumpCard }] : [],
      count: s.stock.length,
    },
  ];
  if (viewer !== null) v.hand = sortCards(s.hands[viewer], RANKS_36, suitOrder);

  if (over) {
    v.status = s.durak === null ? msg('durak.draw') : msg('durak.isDurak', undefined, s.durak);
    v.summary = {
      title: v.status,
      lines: [],
      rows: s.hands.map((_, seat) => ({
        seat,
        value: msg('durak.losses', { count: s.losses[seat] }),
        ...(seat === s.durak ? { tone: 'bad' as const } : {}),
      })),
    };
    v.actions = [{ id: 'next', label: msg('nextRound'), tone: 'primary' }];
    return v;
  }
  const defending = s.turn === s.defender;
  v.status = defending
    ? msg('durak.defends', undefined, s.turn)
    : msg(s.table.length === 0 ? 'durak.attacks' : 'durak.mayAdd', undefined, s.turn);
  if (viewer !== s.turn) return v;
  if (defending) {
    v.select = 'one';
    v.targets = openAttacks(s);
    v.playLabel = msg('durak.beat');
    v.actions = [{ id: 'take', label: msg('durak.take'), tone: 'danger' }];
  } else {
    v.select = 'many';
    v.playLabel = msg(s.table.length === 0 ? 'durak.attack' : 'durak.add');
    if (s.table.length > 0) v.actions = [{ id: 'pass', label: msg('durak.done') }];
  }
  return v;
}

export const durak: GameScript<DurakState> = {
  id: 'durak',
  ranks: RANKS_36,
  minPlayers: 2,
  maxPlayers: 6,
  start: (count, rng) => deal(count, rng, Array<number>(count).fill(0), null),
  move,
  view,
};
