import { describe, it, expect } from 'vitest';
import { applyAction, createGame } from './engine';
import type { Card, GolfAction, GolfState, Rank } from './types';

const c = (id: number, rank: Rank): Card => ({ id, rank, suit: rank === 'JOKER' ? null : 'clubs' });

/**
 * Deck for two players: deal order is Ann 6, Ben 6, then the discard start card, then the draw
 * pile. The top of the deck is the last element, so the array is reversed.
 * Ann: 2,3,4,5,6,7  Ben: 8,9,10,A,2,3  discard: 4  draw pile: K,Q,5,5,...
 */
const deck = (draws: Rank[] = ['K', 'Q', '5', '5', '5', '5', '5', '5']): Card[] => {
  const ranks: Rank[] = [
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    'A',
    '2',
    '3',
    '4',
    ...draws,
  ];
  return ranks.map((r, i) => c(i, r)).reverse();
};

const run = (state: GolfState, ...actions: GolfAction[]): GolfState =>
  actions.reduce((s, a) => {
    const r = applyAction(s, a, (x) => x);
    if (!r.ok) throw new Error(`${a.type}: ${r.error}`);
    return r.state;
  }, state);

const started = (d = deck()) =>
  run(
    createGame(['Ann', 'Ben'], { deck: d }),
    { type: 'flip_start', slot: 0 },
    { type: 'flip_start', slot: 1 },
    { type: 'flip_start', slot: 0 },
    { type: 'flip_start', slot: 1 },
  );

describe('golf start', () => {
  it('deals six cards each and one discard', () => {
    const s = createGame(['Ann', 'Ben'], { deck: deck() });
    expect(s.players.map((p) => p.hand.length)).toEqual([6, 6]);
    expect(s.discard).toHaveLength(1);
    expect(s.phase).toBe('flip_start');
  });

  it('lets each player flip two cards, then starts the turns', () => {
    const s = started();
    expect(s.phase).toBe('turn');
    expect(s.currentIndex).toBe(0);
    expect(s.players.map((p) => p.faceUp.filter(Boolean).length)).toEqual([2, 2]);
  });

  it('rejects flipping the same card twice and bad slots', () => {
    const s = run(createGame(['Ann', 'Ben'], { deck: deck() }), { type: 'flip_start', slot: 0 });
    expect(applyAction(s, { type: 'flip_start', slot: 0 })).toEqual({
      ok: false,
      error: 'already_face_up',
    });
    expect(applyAction(s, { type: 'flip_start', slot: 6 })).toEqual({
      ok: false,
      error: 'invalid_slot',
    });
    expect(applyAction(s, { type: 'draw', source: 'deck' })).toEqual({
      ok: false,
      error: 'wrong_phase',
    });
  });
});

describe('golf turns', () => {
  it('swaps a drawn card in and puts the old card face up on the discard', () => {
    const s = run(started(), { type: 'draw', source: 'deck' }, { type: 'swap', slot: 5 });
    expect(s.players[0].hand[5].rank).toBe('K');
    expect(s.players[0].faceUp[5]).toBe(true);
    expect(s.discard[s.discard.length - 1].rank).toBe('7');
    expect(s.currentIndex).toBe(1);
  });

  it('takes the top discard and forbids discarding it again', () => {
    const s = run(started(), { type: 'draw', source: 'discard' });
    expect(s.drawn?.card.rank).toBe('4');
    expect(s.discard).toHaveLength(0);
    expect(applyAction(s, { type: 'discard_drawn', slot: 2 })).toEqual({
      ok: false,
      error: 'must_swap',
    });
    const next = run(s, { type: 'swap', slot: 2 });
    expect(next.players[0].hand[2].rank).toBe('4');
  });

  it('discards a deck card and flips a face-down card', () => {
    const s = run(started(), { type: 'draw', source: 'deck' }, { type: 'discard_drawn', slot: 4 });
    expect(s.players[0].faceUp[4]).toBe(true);
    expect(s.discard[s.discard.length - 1].rank).toBe('K');
  });

  it('requires a flip while face-down cards exist and rejects face-up targets', () => {
    const s = run(started(), { type: 'draw', source: 'deck' });
    expect(applyAction(s, { type: 'discard_drawn' })).toEqual({ ok: false, error: 'must_flip' });
    expect(applyAction(s, { type: 'discard_drawn', slot: 0 })).toEqual({
      ok: false,
      error: 'already_face_up',
    });
  });

  it('reshuffles the discard pile when the deck runs out and fails when nothing is left', () => {
    const base = started();
    const empty = { ...base, deck: [], discard: [c(90, '2'), c(91, '3'), c(92, '4')] };
    const r = applyAction(empty, { type: 'draw', source: 'deck' }, (x) => x);
    expect(r.ok && r.state.drawn?.card.id).toBe(91);
    expect(r.ok && r.state.discard.map((x) => x.id)).toEqual([92]);
    const stuck = { ...base, deck: [], discard: [c(90, '2')] };
    expect(applyAction(stuck, { type: 'draw', source: 'deck' })).toEqual({
      ok: false,
      error: 'deck_empty',
    });
  });
});
