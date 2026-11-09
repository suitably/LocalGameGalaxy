import { describe, it, expect } from 'vitest';
import { prepareHostAction } from '../hostActions';
import { tabletopReducer, type TabletopAction } from '../tabletopReducer';
import { table, wid } from './routineFixture';

const state = table([
  wid('die', { type: 'die', sides: 6, currentValue: 1 }),
  wid('deck', {
    type: 'deck',
    cardIds: ['a', 'b', 'c', 'd'],
    backContent: { type: 'text', value: '' },
  }),
  wid('wheel', { type: 'spinner', options: ['x', 'y', 'z'], angle: 0 }),
  wid('bag', { type: 'bag', isInfinite: true, templateWidget: wid('t', { type: 'token' }) }),
]);
const prep = (action: TabletopAction, seed = 5) =>
  prepareHostAction(action, state.game, 1, seed, 9);

describe('host-decided randomness (#694, ADR-0005)', () => {
  it('writes the random results into the payload and stamps seed and sender seat', () => {
    const roll = prep({ type: 'ROLL_DIE', payload: { dieId: 'die' } });
    expect(roll).toMatchObject({
      payload: { value: expect.any(Number) },
      host: { seed: 5, seat: 1, now: 9 },
    });
    const shuffle = prep({ type: 'SHUFFLE_DECK', payload: { deckId: 'deck' } });
    expect(shuffle.type === 'SHUFFLE_DECK' && [...(shuffle.payload.order ?? [])].sort()).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(prep({ type: 'SPIN_SPINNER', payload: { spinnerId: 'wheel' } })).toMatchObject({
      payload: { index: expect.any(Number) },
    });
    expect(prep({ type: 'DRAW_FROM_BAG', payload: { bagId: 'bag' } })).toMatchObject({
      payload: { spawnedId: expect.stringMatching(/^tok_/) },
    });
  });

  it('is deterministic per seed and overwrites a stamp forged by a phone', () => {
    const action: TabletopAction = { type: 'SHUFFLE_DECK', payload: { deckId: 'deck' } };
    expect(tabletopReducer(state, prep(action, 3))).toEqual(
      tabletopReducer(state, prep(action, 3)),
    );
    const forged = { ...action, host: { seed: 1, seat: 0, now: 0 } } as TabletopAction;
    expect(prep(forged).host).toEqual({ seed: 5, seat: 1, now: 9 });
    // the host's own actions leave the seat to its viewer
    expect(prepareHostAction(action, state.game, undefined, 2, 0).host).toEqual({
      seed: 2,
      now: 0,
    });
  });

  it('keeps results the caller already decided', () => {
    expect(prep({ type: 'ROLL_DIE', payload: { dieId: 'die', value: 6 } })).toMatchObject({
      payload: { value: 6 },
    });
    const next = tabletopReducer(
      state,
      prep({ type: 'SHUFFLE_DECK', payload: { deckId: 'deck', order: ['d', 'c', 'b', 'a'] } }),
    );
    expect(next.game.widgets.deck).toMatchObject({ cardIds: ['d', 'c', 'b', 'a'] });
    // an order that is not the same cards is ignored
    const bad = tabletopReducer(state, {
      type: 'SHUFFLE_DECK',
      payload: { deckId: 'deck', order: ['x'] },
    });
    expect([...(bad.game.widgets.deck as unknown as { cardIds: string[] }).cardIds].sort()).toEqual(
      ['a', 'b', 'c', 'd'],
    );
  });
});
