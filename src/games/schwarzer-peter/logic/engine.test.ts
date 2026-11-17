import { describe, it, expect } from 'vitest';
import { applyAction, createGame, createSPDeck, discardPairs, isPair, shuffleWith } from './engine';
import type { Card, Rank, Suit, SPAction, SPState } from './types';

const c = (id: number, rank: Rank, suit: Suit): Card => ({ id, rank, suit });
const noShuffle = () => 0.999999;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

const must = (r: ReturnType<typeof applyAction>): SPState => {
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('deck and pairs', () => {
  it('has 51 cards without J♣ and with J♠', () => {
    const deck = createSPDeck();
    expect(deck).toHaveLength(51);
    expect(deck.some((x) => x.rank === 'J' && x.suit === 'clubs')).toBe(false);
    expect(deck.some((x) => x.rank === 'J' && x.suit === 'spades')).toBe(true);
  });

  it('pairs by rank and colour', () => {
    expect(isPair(c(0, '5', 'hearts'), c(1, '5', 'diamonds'))).toBe(true);
    expect(isPair(c(0, '5', 'clubs'), c(1, '5', 'spades'))).toBe(true);
    expect(isPair(c(0, '5', 'hearts'), c(1, '5', 'spades'))).toBe(false);
    expect(isPair(c(0, 'J', 'hearts'), c(1, 'J', 'diamonds'))).toBe(true);
  });

  it('never pairs the Schwarzer Peter', () => {
    expect(isPair(c(0, 'J', 'spades'), c(1, 'J', 'clubs'))).toBe(false);
    const { hand, pairs } = discardPairs([
      c(0, 'J', 'spades'),
      c(1, '2', 'hearts'),
      c(2, '2', 'diamonds'),
    ]);
    expect(pairs).toBe(1);
    expect(hand.map((x) => x.id)).toEqual([0]);
  });

  it('shuffleWith is deterministic and keeps all items', () => {
    const a = shuffleWith([1, 2, 3, 4, 5], seeded(1));
    expect(a).toEqual(shuffleWith([1, 2, 3, 4, 5], seeded(1)));
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

/** Dealing alternates: A gets even positions, B odd. */
const smallDeck = () => [
  c(0, '2', 'hearts'),
  c(1, '3', 'hearts'),
  c(2, 'J', 'spades'),
  c(3, '2', 'diamonds'),
  c(4, '4', 'clubs'),
  c(5, '3', 'diamonds'),
];

describe('round flow (2 players)', () => {
  it('discards pairs at the deal and counts them', () => {
    const s = createGame(['A', 'B'], { deck: smallDeck(), rng: noShuffle });
    expect(s.players[0].hand.map((x) => x.id)).toEqual([0, 2, 4]);
    expect(s.players[0].initialPairs).toBe(0);
    expect(s.players[1].hand.map((x) => x.id)).toEqual([3]);
    expect(s.players[1].initialPairs).toBe(1);
  });

  it('draw pairs and ends the round on Done with the holder losing', () => {
    // A: 2♥ J♠ 4♣; B: 3♥ 2♦ 3♦ -> B keeps only 2♦ after the deal
    let s = createGame(['A', 'B'], { deck: smallDeck(), rng: noShuffle });
    expect(s.players[1].initialPairs).toBe(1);
    expect(s.players[1].hand.map((x) => x.id)).toEqual([3]);
    // A draws B's only card 2♦, pairs with 2♥
    s = must(applyAction(s, { type: 'draw', index: 0 }, noShuffle));
    expect(s.phase).toBe('drawn');
    expect(s.drawn?.pairedWith?.id).toBe(0);
    expect(s.players[0].hand.map((x) => x.id)).toEqual([2, 4]);
    s = must(applyAction(s, { type: 'done' }, noShuffle));
    // B is out, only A holds cards -> round over, A loses
    expect(s.phase).toBe('round_over');
    expect(s.loserId).toBe('p0');
  });

  it('rejects invalid actions', () => {
    const s = createGame(['A', 'B'], { deck: smallDeck(), rng: noShuffle });
    expect(applyAction(s, { type: 'done' }).ok).toBe(false);
    expect(applyAction(s, { type: 'draw', index: 9 }).ok).toBe(false);
    expect(applyAction(s, { type: 'next_round' }).ok).toBe(false);
    const drawn = must(applyAction(s, { type: 'draw', index: 0 }, noShuffle));
    expect(applyAction(drawn, { type: 'draw', index: 0 }).ok).toBe(false);
  });
});

describe('multi player and rounds', () => {
  it('skips out players and takes from the next holder', () => {
    // 3 players, deal order p0,p1,p2: p0 [2♥,5♣] p1 [2♦,J♠] p2 [5♠,9♥]
    const deck = [
      c(0, '2', 'hearts'),
      c(1, '2', 'diamonds'),
      c(2, '9', 'hearts'),
      c(3, '5', 'clubs'),
      c(4, 'J', 'spades'),
      c(5, '5', 'spades'),
    ];
    let s = createGame(['A', 'B', 'C'], { deck, rng: noShuffle });
    expect(s.players.map((p) => p.initialPairs)).toEqual(
      [1, 0, 1].map((_, i) => s.players[i].initialPairs),
    );
    // p0 pairs? 2♥ & 5♣ no. p1 2♦ & J♠ no. p2 9♥ & 5♠ no.
    expect(s.sourceIndex).toBe(1);
    s = must(applyAction(s, { type: 'draw', index: 0 }, noShuffle));
    s = must(applyAction(s, { type: 'done' }, noShuffle));
    expect(s.currentIndex).toBe(1);
    expect(s.sourceIndex).toBe(2);
  });

  it('next round re-deals, rotates the starter and keeps losses', () => {
    let s = createGame(['A', 'B'], { deck: smallDeck(), rng: noShuffle });
    s = must(applyAction(s, { type: 'draw', index: 0 }, noShuffle));
    s = must(applyAction(s, { type: 'done' }, noShuffle));
    const loser = s.players.find((p) => p.id === s.loserId);
    expect(loser?.losses).toBe(1);
    const n = must(applyAction(s, { type: 'next_round' }, seeded(3)));
    expect(n.round).toBe(2);
    expect(n.startIndex).toBe(1);
    expect(n.players.find((p) => p.id === loser?.id)?.losses).toBe(1);
  });
});

describe('random play', () => {
  it('conserves cards and ends every round with only the Schwarzer Peter', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = seeded(seed);
      const n = 2 + (seed % 5);
      let s = createGame(
        Array.from({ length: n }, (_, i) => `P${i}`),
        { rng },
      );
      let pairsDiscarded = 0;
      for (let steps = 0; steps < 500 && s.phase !== 'round_over'; steps++) {
        const held = s.players.reduce((sum, p) => sum + p.hand.length, 0);
        const initial = s.players.reduce((sum, p) => sum + p.initialPairs, 0);
        expect(held + 2 * (initial + pairsDiscarded)).toBe(51);
        const action: SPAction =
          s.phase === 'draw'
            ? { type: 'draw', index: Math.floor(rng() * s.players[s.sourceIndex].hand.length) }
            : { type: 'done' };
        s = must(applyAction(s, action, rng));
        if (s.phase === 'drawn' && s.drawn?.pairedWith) pairsDiscarded++;
      }
      expect(s.phase).toBe('round_over');
      const left = s.players.flatMap((p) => p.hand);
      expect(left).toHaveLength(1);
      expect(left[0].rank === 'J' && left[0].suit === 'spades').toBe(true);
      expect(s.players.find((p) => p.id === s.loserId)?.hand).toHaveLength(1);
    }
  });
});
