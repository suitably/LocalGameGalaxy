/**
 * Schwarzer Peter engine: pure, validated actions [ID: LOGIC-SP-ENGINE]
 *
 * The deck order and every shuffle come from injected inputs, so tests are deterministic. The
 * source hand is shuffled when a turn starts, so the owner's arrangement reveals nothing.
 */
import { createDeck, isRed } from '../../../modules/playing-cards';
import type { Card, Rng, SPAction, SPPlayer, SPResult, SPState } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Fisher-Yates on a copy. */
export function shuffleWith<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The 51-card deck: standard 52 minus J♣; J♠ is the Schwarzer Peter. */
export const createSPDeck = (): Card[] =>
  createDeck().filter((c) => !(c.rank === 'J' && c.suit === 'clubs'));

export const isBlackPeter = (c: Card): boolean => c.rank === 'J' && c.suit === 'spades';

/** Same rank and colour; the Schwarzer Peter never pairs. */
export function isPair(a: Card, b: Card): boolean {
  if (a.id === b.id || isBlackPeter(a) || isBlackPeter(b)) return false;
  return a.rank === b.rank && isRed(a) === isRed(b);
}

/** Removes all pairs from a hand, keeping the order of the remaining cards. */
export function discardPairs(hand: readonly Card[]): { hand: Card[]; pairs: number } {
  const kept: Card[] = [];
  let pairs = 0;
  for (const card of hand) {
    const at = kept.findIndex((k) => isPair(k, card));
    if (at >= 0) {
      kept.splice(at, 1);
      pairs++;
    } else kept.push(card);
  }
  return { hand: kept, pairs };
}

const holders = (players: readonly SPPlayer[]) => players.filter((p) => p.hand.length > 0);

/** Next index clockwise after `from` whose player still holds cards, or -1. */
function nextHolder(players: readonly SPPlayer[], from: number): number {
  for (let step = 1; step < players.length; step++) {
    const i = (from + step) % players.length;
    if (players[i].hand.length > 0) return i;
  }
  return -1;
}

/** Ends the round when at most one player holds cards; otherwise picks the source and shuffles. */
function beginTurn(state: SPState, currentIndex: number, rng: Rng): SPState {
  const { players } = state;
  const left = holders(players);
  if (left.length <= 1) {
    const loser = left[0] ?? null;
    return {
      ...state,
      currentIndex,
      phase: 'round_over',
      drawn: null,
      loserId: loser?.id ?? null,
      players: players.map((p) => (p.id === loser?.id ? { ...p, losses: p.losses + 1 } : p)),
    };
  }
  const sourceIndex = nextHolder(players, currentIndex);
  return {
    ...state,
    currentIndex,
    sourceIndex,
    phase: 'draw',
    drawn: null,
    loserId: null,
    players: players.map((p, i) =>
      i === sourceIndex ? { ...p, hand: shuffleWith(p.hand, rng) } : p,
    ),
  };
}

function deal(names: string[], startIndex: number, round: number, losses: number[], deck: Card[]) {
  const hands: Card[][] = names.map(() => []);
  deck.forEach((card, i) => hands[i % names.length].push(card));
  const players: SPPlayer[] = names.map((name, i) => {
    const { hand, pairs } = discardPairs(hands[i]);
    return { id: `p${i}`, name, hand, initialPairs: pairs, turns: 0, losses: losses[i] };
  });
  const state: SPState = {
    players,
    currentIndex: startIndex,
    sourceIndex: startIndex,
    startIndex,
    round,
    phase: 'draw',
    drawn: null,
    loserId: null,
  };
  return state;
}

export interface CreateGameOptions {
  rng?: Rng;
  /** Fixed deal order (tests); otherwise the standard deck is shuffled with `rng`. */
  deck?: Card[];
}

function startRound(
  names: string[],
  startIndex: number,
  round: number,
  losses: number[],
  options: CreateGameOptions,
): SPState {
  const rng = options.rng ?? Math.random;
  const deck = options.deck ?? shuffleWith(createSPDeck(), rng);
  const dealt = deal(names, startIndex, round, losses, deck);
  // The starter must hold cards; otherwise take the next holder (or end the round at once).
  const first =
    dealt.players[startIndex].hand.length > 0 ? startIndex : nextHolder(dealt.players, startIndex);
  return beginTurn(dealt, first < 0 ? startIndex : first, rng);
}

export function createGame(names: string[], options: CreateGameOptions = {}): SPState {
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS)
    throw new Error(`Schwarzer Peter needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  return startRound(
    names,
    0,
    1,
    names.map(() => 0),
    options,
  );
}

const fail = (error: string): SPResult => ({ ok: false, error });

export function applyAction(state: SPState, action: SPAction, rng: Rng = Math.random): SPResult {
  const me = state.players[state.currentIndex];
  switch (action.type) {
    case 'draw': {
      if (state.phase !== 'draw') return fail('not_draw_phase');
      const source = state.players[state.sourceIndex];
      const card = source.hand[action.index];
      if (!card) return fail('bad_index');
      const pairIdx = me.hand.findIndex((h) => isPair(h, card));
      const pairedWith = pairIdx >= 0 ? me.hand[pairIdx] : null;
      const players = state.players.map((p, i) => {
        if (i === state.sourceIndex)
          return { ...p, hand: p.hand.filter((_, k) => k !== action.index) };
        if (i === state.currentIndex)
          return {
            ...p,
            hand: pairedWith ? p.hand.filter((_, k) => k !== pairIdx) : [...p.hand, card],
          };
        return p;
      });
      return {
        ok: true,
        state: {
          ...state,
          players,
          phase: 'drawn',
          drawn: { card, fromId: source.id, pairedWith },
        },
      };
    }
    case 'done': {
      if (state.phase !== 'drawn') return fail('not_drawn_phase');
      const players = state.players.map((p, i) =>
        i === state.currentIndex ? { ...p, turns: p.turns + 1 } : p,
      );
      const next = nextHolder(players, state.currentIndex);
      return {
        ok: true,
        state: beginTurn({ ...state, players }, next < 0 ? state.currentIndex : next, rng),
      };
    }
    case 'next_round': {
      if (state.phase !== 'round_over') return fail('round_not_over');
      const names = state.players.map((p) => p.name);
      const start = (state.startIndex + 1) % names.length;
      const losses = state.players.map((p) => p.losses);
      return { ok: true, state: startRound(names, start, state.round + 1, losses, { rng }) };
    }
  }
}
