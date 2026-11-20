import { describe, it, expect } from 'vitest';
import { applyAction, createGame } from './engine';
import { createDeck } from './deck';
import type { GolfAction, GolfState } from './types';

const id = <T>(x: T[]) => x;

const run = (state: GolfState, ...actions: GolfAction[]): GolfState =>
  actions.reduce((s, a) => {
    const r = applyAction(s, a, id);
    if (!r.ok) throw new Error(`${a.type}: ${r.error}`);
    return r.state;
  }, state);

/** Flips two cards each, then Ann and Ben swap in every slot so hands become face up. */
const startFor = (names: string[], totalRounds?: number) => {
  let s = createGame(names, { deck: createDeck(names.length), totalRounds });
  for (let p = 0; p < names.length; p++) {
    s = run(s, { type: 'flip_start', slot: 0 }, { type: 'flip_start', slot: 1 });
  }
  return s;
};

/** Current player swaps the slot with the deck card (a legal, simple turn). */
const swapTurn = (s: GolfState, slot: number) =>
  run(s, { type: 'draw', source: 'deck' }, { type: 'swap', slot });

describe('golf round end', () => {
  it('gives every other player exactly one more turn after a hand is complete', () => {
    let s = startFor(['Ann', 'Ben', 'Cy']);
    // Ann completes her hand (slots 2..5), Ben and Cy play filler turns in between.
    const slots = [2, 3, 4, 5];
    for (let i = 0; i < slots.length; i++) {
      s = swapTurn(s, slots[i]);
      expect(s.closerIndex).toBe(i === slots.length - 1 ? 0 : null);
      if (i < slots.length - 1) s = swapTurn(swapTurn(s, 2), 2);
    }
    expect(s.phase).toBe('turn');
    expect(s.currentIndex).toBe(1);
    s = swapTurn(s, 3);
    expect(s.phase).toBe('turn');
    s = swapTurn(s, 3);
    expect(s.phase).toBe('round_over');
    expect(s.players.every((p) => p.faceUp.every(Boolean))).toBe(true);
    expect(s.history).toHaveLength(1);
    expect(s.players.map((p) => p.totalScore)).toEqual(s.history[0].scores);
  });

  it('plays 9 holes, rotates the starter and ends with winners', () => {
    let s = startFor(['Ann', 'Ben']);
    let guard = 0;
    while (s.phase !== 'game_over' && guard++ < 2000) {
      if (s.phase === 'round_over') {
        s = run(s, { type: 'next_round' });
        expect(s.currentIndex).toBe((s.roundNumber - 1) % 2);
        s = run(
          s,
          ...Array(4)
            .fill({ type: 'flip_start', slot: 0 })
            .map((a, i) => ({ ...a, slot: i % 2 })),
        );
      } else if (s.phase === 'turn') {
        const hidden = s.players[s.currentIndex].faceUp.findIndex((f) => !f);
        s = swapTurn(s, hidden);
      }
    }
    expect(s.phase).toBe('game_over');
    expect(s.history).toHaveLength(9);
    const best = Math.min(...s.players.map((p) => p.totalScore));
    expect(s.winnerIds).toEqual(s.players.filter((p) => p.totalScore === best).map((p) => p.id));
    expect(applyAction(s, { type: 'next_round' })).toEqual({ ok: false, error: 'wrong_phase' });
  });

  it('keeps all cards in play across random games', () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (const count of [2, 5]) {
      let s = createGame(
        Array.from({ length: count }, (_, i) => `P${i}`),
        { totalRounds: 3 },
      );
      const total = count <= 4 ? 54 : 108;
      for (let step = 0; step < 3000 && s.phase !== 'game_over'; step++) {
        const ids = [
          ...s.players.flatMap((p) => p.hand.map((x) => x.id)),
          ...s.deck.map((x) => x.id),
          ...s.discard.map((x) => x.id),
          ...(s.drawn ? [s.drawn.card.id] : []),
        ];
        expect(new Set(ids).size).toBe(total);
        expect(ids).toHaveLength(total);
        const me = s.players[s.currentIndex];
        const hidden = me.faceUp.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0);
        let a: GolfAction;
        if (s.phase === 'flip_start') a = { type: 'flip_start', slot: hidden[0] };
        else if (s.phase === 'round_over') a = { type: 'next_round' };
        else if (s.phase === 'turn')
          a = { type: 'draw', source: rand(3) === 0 ? 'discard' : 'deck' };
        else if (s.drawn?.source === 'deck' && rand(2) === 0)
          a = hidden.length
            ? { type: 'discard_drawn', slot: hidden[rand(hidden.length)] }
            : { type: 'discard_drawn' };
        else a = { type: 'swap', slot: rand(6) };
        s = run(s, a);
      }
      expect(s.phase).toBe('game_over');
    }
  });
});
