import { describe, it, expect } from 'vitest';
import { applyAction, createGame } from './engine';
import { DECK_SIZE } from './deck';

describe('random play', () => {
  /** Plays random legal-ish actions and checks that no card is lost or duplicated. */
  it('keeps all 54 cards in play across random games', () => {
    let seed = 12345;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };

    for (let game = 0; game < 20; game++) {
      let state = createGame(['A', 'B', 'C', 'D'], { targetScore: 60 });
      for (let step = 0; step < 400 && state.phase !== 'game_over'; step++) {
        const ids = [
          ...state.players.flatMap((p) => p.hand.map((card) => card.id)),
          ...state.deck.map((card) => card.id),
          ...state.discard.map((card) => card.id),
          // A drawn card is held outside all piles until it is swapped or discarded.
          ...(state.drawn ? [state.drawn.card.id] : []),
        ];
        expect(new Set(ids).size).toBe(DECK_SIZE);
        expect(ids).toHaveLength(DECK_SIZE);

        let action: Parameters<typeof applyAction>[1];
        switch (state.phase) {
          case 'turn':
            action =
              rand(12) === 0
                ? { type: 'call_cabo' }
                : { type: 'draw', source: rand(3) === 0 ? 'discard' : 'deck' };
            break;
          case 'drawn':
            action =
              state.drawn?.source === 'deck' && rand(2) === 0
                ? { type: 'discard_drawn' }
                : { type: 'swap', slot: rand(4) };
            break;
          case 'power': {
            const target = state.players[(state.currentIndex + 1) % state.players.length].id;
            if (state.power === 'peek_own') action = { type: 'power_peek_own', slot: rand(4) };
            else if (state.power === 'peek_other')
              action = { type: 'power_peek_other', targetId: target, slot: rand(4) };
            else
              action = {
                type: 'power_blind_swap',
                slot: rand(4),
                targetId: target,
                targetSlot: rand(4),
              };
            break;
          }
          case 'reveal':
            action = { type: 'end_turn' };
            break;
          case 'round_over':
            action = { type: 'next_round' };
            break;
          default:
            throw new Error('unreachable');
        }

        const result = applyAction(state, action);
        // Illegal picks (e.g. Cabo called twice) are fine; the state must stay unchanged.
        if (result.ok) state = result.state;
      }
    }
  });
});
