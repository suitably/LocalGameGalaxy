import { describe, it, expect } from 'vitest';
import { applyAction, canDraw, createGame, playableCards } from './engine';
import type { MauMauAction, MauMauState } from './types';

describe('random play', () => {
  it('conserves all 32 cards and finishes rounds', () => {
    let seed = 4242;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const shuffle = <T>(a: T[]): T[] => {
      const r = [...a];
      for (let i = r.length - 1; i > 0; i--) {
        const j = rand(i + 1);
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    };
    let finished = 0;
    for (let g = 0; g < 30; g++) {
      let state: MauMauState = createGame(['A', 'B', 'C', 'D'], { shuffle });
      for (let step = 0; step < 600 && finished < 30 * 2; step++) {
        const ids = [
          ...state.players.flatMap((p) => p.hand.map((x) => x.id)),
          ...state.deck.map((x) => x.id),
          ...state.discard.map((x) => x.id),
        ];
        expect(new Set(ids).size).toBe(32);
        expect(ids).toHaveLength(32);

        let action: MauMauAction;
        const playable = playableCards(state);
        if (state.phase === 'round_over') {
          finished++;
          if (finished % 2 === 0) break;
          action = { type: 'next_round' };
        } else if (state.phase === 'wish') {
          action = {
            type: 'wish',
            suit: (['hearts', 'spades', 'clubs', 'diamonds'] as const)[rand(4)],
          };
        } else if (playable.length > 0 && rand(5) > 0) {
          action = { type: 'play', cardId: playable[rand(playable.length)].id };
        } else if (state.pendingDraw > 0) {
          action = { type: 'take_penalty' };
        } else if (state.phase === 'turn' && canDraw(state)) {
          action = { type: 'draw' };
        } else {
          action = { type: 'pass' };
        }
        const r = applyAction(state, action, shuffle);
        if (!r.ok) throw new Error(`${action.type}: ${r.error}`);
        state = r.state;
      }
    }
    expect(finished).toBeGreaterThan(0);
  });
});
