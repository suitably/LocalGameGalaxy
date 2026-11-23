/**
 * Skat for three players [ID: LOGIC-TABLETOP-SCRIPT-SKAT]
 *
 * Deal 10-10-10 and two cards as the skat, bid (middlehand to forehand, then rearhand to the
 * winner), pick up the skat or play hand, declare suit, grand or null, play ten tricks.
 * Rules and values: `skatRules.ts`. If everyone passes, the next dealer deals.
 */
import type { Rng } from '../../logic/rng';
import { RANKS_32, holdsAll, shuffledDeck, without } from './cardDeck';
import {
  BID_VALUES,
  legalCards,
  nullValue,
  scoreGame,
  trickWinner,
  type SkatGame,
} from './skatRules';
import type { GameScript, ScriptMove } from './scriptTypes';
import { SEATS, type Bidding, type SkatState } from './skatTypes';
import { skatView } from './skatView';

export type { SkatState } from './skatTypes';
const forehand = (s: SkatState) => (s.dealer + 1) % SEATS;

function deal(dealer: number, rng: Rng, scores: number[], rounds: number): SkatState {
  const deck = shuffledDeck(RANKS_32, rng);
  const hands = [0, 1, 2].map(() => deck.splice(0, 10));
  return {
    dealer,
    hands,
    skat: deck,
    phase: 'bidding',
    bidding: {
      value: 0,
      speaker: (dealer + 2) % SEATS,
      listener: (dealer + 1) % SEATS,
      turn: 'speaker',
      stage: 1,
    },
    declarer: null,
    game: null,
    trick: [],
    turn: (dealer + 2) % SEATS,
    taken: [[], [], []],
    tricks: [0, 0, 0],
    declarerCards: [],
    result: null,
    scores,
    rounds,
  };
}

const bidTurn = (b: Bidding) => (b.turn === 'speaker' ? b.speaker : b.listener);

/** `winner` stays in after one of the two passed. */
function stageWon(s: SkatState, winner: number): SkatState {
  const b = s.bidding;
  if (b.stage === 1) {
    const next: Bidding = { ...b, speaker: s.dealer, listener: winner, turn: 'speaker', stage: 2 };
    return { ...s, bidding: next, turn: s.dealer };
  }
  if (b.value === 0) {
    // Nobody said a number: forehand may play at 18 or pass as well.
    const next: Bidding = { ...b, speaker: winner, listener: -1, turn: 'speaker', stage: 3 };
    return { ...s, bidding: next, turn: winner };
  }
  return { ...s, phase: 'pickup', declarer: winner, turn: winner };
}

function bid(s: SkatState, seat: number, m: ScriptMove): SkatState {
  const b = s.bidding;
  if (m.kind !== 'action' || seat !== bidTurn(b)) return s;
  if (b.turn === 'listener') {
    if (m.id === 'hold') return { ...s, bidding: { ...b, turn: 'speaker' }, turn: b.speaker };
    return m.id === 'pass' ? stageWon(s, b.speaker) : s;
  }
  if (m.id === 'pass') {
    // Everyone passed: the hand is thrown in.
    if (b.stage === 3) return { ...s, phase: 'roundEnd', result: null, rounds: s.rounds + 1 };
    return stageWon(s, b.listener);
  }
  if (m.id !== 'bid') return s;
  const value = Number(m.arg);
  if (!BID_VALUES.includes(value) || value <= b.value) return s;
  const said = { ...b, value };
  if (b.stage === 3) return { ...s, bidding: said, phase: 'pickup', declarer: seat, turn: seat };
  return { ...s, bidding: { ...said, turn: 'listener' }, turn: b.listener };
}

/** Games that may be declared: `C`, `S`, `H`, `D`, `grand`, `null`, `nullOuvert`. */
const DECLARATIONS = ['C', 'S', 'H', 'D', 'grand', 'null', 'nullOuvert'] as const;

function declare(s: SkatState, seat: number, m: ScriptMove): SkatState {
  if (m.kind !== 'action' || m.id !== 'declare' || seat !== s.declarer) return s;
  const choice = String(m.arg) as (typeof DECLARATIONS)[number];
  if (!DECLARATIONS.includes(choice)) return s;
  const hand = s.game?.hand ?? false;
  const game: SkatGame =
    choice === 'null' || choice === 'nullOuvert'
      ? { type: 'null', hand, ouvert: choice === 'nullOuvert' }
      : { type: choice, hand, ouvert: false };
  if (game.type === 'null' && nullValue(game) < s.bidding.value) return s;
  return {
    ...s,
    game,
    phase: 'play',
    turn: forehand(s),
    declarerCards: [...s.hands[seat], ...s.skat],
  };
}

function finish(s: SkatState): SkatState {
  const declarer = s.declarer!;
  const result = scoreGame({
    declarer,
    game: s.game!,
    bid: s.bidding.value,
    cards: s.declarerCards,
    taken: [...s.taken[declarer], ...s.skat],
    declarerTricks: s.tricks[declarer],
    tricksPlayed: s.tricks.reduce((a, b) => a + b, 0),
  });
  const delta = result.won ? result.value : -2 * result.value;
  return {
    ...s,
    phase: 'roundEnd',
    result,
    scores: s.scores.map((score, i) => (i === declarer ? score + delta : score)),
    rounds: s.rounds + 1,
  };
}

function playCard(s: SkatState, seat: number, m: ScriptMove): SkatState {
  if (m.kind !== 'cards' || m.cards.length !== 1 || seat !== s.turn) return s;
  const type = s.game!.type;
  const trick = s.trick.length === SEATS ? [] : s.trick;
  const [card] = m.cards;
  if (!legalCards(s.hands[seat], trick[0]?.card, type).includes(card)) return s;
  const played = [...trick, { seat, card }];
  const hands = s.hands.map((h, i) => (i === seat ? without(h, [card]) : h));
  if (played.length < SEATS) return { ...s, hands, trick: played, turn: (seat + 1) % SEATS };
  const cards = played.map((p) => p.card);
  const winner = played[trickWinner(cards, type)].seat;
  const next: SkatState = {
    ...s,
    hands,
    trick: played,
    turn: winner,
    taken: s.taken.map((t, i) => (i === winner ? [...t, ...cards] : t)),
    tricks: s.tricks.map((n, i) => (i === winner ? n + 1 : n)),
  };
  // A null game is lost with the declarer's first trick.
  const nullLost = type === 'null' && winner === s.declarer;
  return nullLost || hands[seat].length === 0 ? finish(next) : next;
}

function move(s: SkatState, seat: number, m: ScriptMove, rng: Rng): SkatState {
  switch (s.phase) {
    case 'bidding':
      return bid(s, seat, m);
    case 'pickup': {
      if (m.kind !== 'action' || seat !== s.declarer) return s;
      const game: SkatGame = { type: 'grand', hand: true, ouvert: false };
      if (m.id === 'hand') return { ...s, phase: 'declare', game };
      if (m.id !== 'pickup') return s;
      const hands = s.hands.map((h, i) => (i === seat ? [...h, ...s.skat] : h));
      return { ...s, hands, skat: [], phase: 'discard' };
    }
    case 'discard': {
      if (m.kind !== 'cards' || seat !== s.declarer || m.cards.length !== 2) return s;
      if (!holdsAll(s.hands[seat], m.cards)) return s;
      const hands = s.hands.map((h, i) => (i === seat ? without(h, m.cards) : h));
      return { ...s, hands, skat: m.cards, phase: 'declare' };
    }
    case 'declare':
      return declare(s, seat, m);
    case 'play':
      return playCard(s, seat, m);
    case 'roundEnd':
      if (m.kind !== 'action' || m.id !== 'next') return s;
      return deal((s.dealer + 1) % SEATS, rng, s.scores, s.rounds);
  }
}
export const skat: GameScript<SkatState> = {
  id: 'skat',
  ranks: RANKS_32,
  minPlayers: 3,
  maxPlayers: 3,
  start: (_count, rng) => deal(Math.floor(rng() * SEATS), rng, [0, 0, 0], 0),
  move,
  view: skatView,
};
