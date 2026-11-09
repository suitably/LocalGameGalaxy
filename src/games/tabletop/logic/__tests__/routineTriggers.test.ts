import { describe, it, expect } from 'vitest';
import { tabletopReducer, type TabletopAction } from '../tabletopReducer';
import type { CounterWidget, TabletopWidget } from '../types';
import { MAX_TRIGGER_RUNS } from '../routineTriggers';
import { diffGame } from '../stateDelta';
import type { WidgetPatch } from '../widgetEdits';
import { button, hand, stamped, table, wid } from './routineFixture';

const counter = (id: string, value = 0) => wid(id, { type: 'counter', value, step: 1 });
const value = (w: Record<string, TabletopWidget>, id: string) => (w[id] as CounterWidget).value;
const bump = (to = 'hits') => [{ op: 'COUNTER', counter: to, delta: 1 }];
const apply = (state: ReturnType<typeof table>, action: TabletopAction) =>
  tabletopReducer(state, stamped(action)).game.widgets;

describe('routine triggers (#694)', () => {
  it('onDrop runs when something lands in the holder', () => {
    const state = table([
      wid('tok', { type: 'token' }),
      wid('box', { type: 'holder', childIds: [], layout: 'grid' }),
      counter('hits'),
      button('t', bump(), [{ on: 'onDrop', holder: 'box' }]),
    ]);
    const next = apply(state, {
      type: 'SNAP_TO_HOLDER',
      payload: { widgetId: 'tok', holderId: 'box' },
    });
    expect(value(next, 'hits')).toBe(1);
    expect(
      value(apply(state, { type: 'MOVE_WIDGET', payload: { id: 'tok', x: 5, y: 5 } }), 'hits'),
    ).toBe(0);
  });

  it('onEnterZone runs when a widget centre moves into the zone', () => {
    const zone = { id: 'z', x: 100, y: 100, width: 50, height: 50 };
    const state = table(
      [
        wid('tok', { type: 'token' }),
        counter('hits'),
        button('t', bump(), [{ on: 'onEnterZone', zone: 'z' }]),
      ],
      { z: zone },
    );
    const into = apply(state, { type: 'MOVE_WIDGET', payload: { id: 'tok', x: 110, y: 110 } });
    expect(value(into, 'hits')).toBe(1);
    expect(
      value(apply(state, { type: 'MOVE_WIDGET', payload: { id: 'tok', x: 300, y: 0 } }), 'hits'),
    ).toBe(0);
  });

  it('onCounter runs when the counter changes; a chain stops at the run limit', () => {
    const state = table([
      counter('score'),
      counter('hits'),
      button('t', bump(), [{ on: 'onCounter', counter: 'score' }]),
      // feeds itself: every run changes the counter it listens to
      button('loop', bump('loops'), [{ on: 'onCounter', counter: 'loops' }]),
      counter('loops'),
    ]);
    const next = apply(state, {
      type: 'UPDATE_COUNTER',
      payload: { counterId: 'score', delta: 2 },
    });
    expect(value(next, 'hits')).toBe(1);
    const looped = apply(state, {
      type: 'UPDATE_COUNTER',
      payload: { counterId: 'loops', delta: 1 },
    });
    expect(value(looped, 'loops')).toBeGreaterThan(1);
    expect(value(looped, 'loops')).toBeLessThanOrEqual(1 + MAX_TRIGGER_RUNS);
  });

  it('onTurnStart runs for the new turn seat, which counts as caller', () => {
    const dice = ['d0', 'd1'].map((id) => wid(id, { type: 'die', sides: 6, currentValue: 0 }));
    const state = table([
      ...dice,
      hand('cup0', 0, ['d0']),
      hand('cup1', 1, ['d1']),
      wid('s0', { type: 'seat', index: 0, color: '', turn: true }),
      wid('s1', { type: 'seat', index: 1, color: '' }),
      button('t', [{ op: 'ROLL', seat: 'caller' }], [{ on: 'onTurnStart' }]),
      button('only0', bump(), [{ on: 'onTurnStart', seat: 0 }]),
      counter('hits'),
    ]);
    // seat 0 passes its turn on; seat 1's dice roll, seat 0's do not
    const next = apply(state, { type: 'NEXT_TURN', payload: {} });
    expect(next.s1).toMatchObject({ turn: true });
    expect(next.d1).toMatchObject({ currentValue: expect.any(Number) });
    expect((next.d1 as { currentValue: number }).currentValue).toBeGreaterThan(0);
    expect(next.d0).toMatchObject({ currentValue: 0 });
    expect(value(next, 'hits')).toBe(0);
  });

  it('remote deltas and editor actions never fire triggers', () => {
    const state = table([
      counter('score'),
      counter('hits'),
      button('t', bump(), [{ on: 'onCounter', counter: 'score' }]),
    ]);
    const host = tabletopReducer(
      state,
      stamped({ type: 'UPDATE_COUNTER', payload: { counterId: 'score', delta: 1 } }),
    );
    const delta = diffGame(state.game, host.game)!;
    // the host's delta already carries the triggered result; a phone just applies it
    const phone = tabletopReducer(state, { type: 'APPLY_REMOTE_DELTA', payload: delta });
    expect(value(phone.game.widgets, 'hits')).toBe(1);
    const edited = apply(state, {
      type: 'PATCH_WIDGETS',
      payload: { patches: { score: { value: 5 } as WidgetPatch } },
    });
    expect(value(edited, 'hits')).toBe(0);
  });
});
