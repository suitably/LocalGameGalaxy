import { describe, it, expect } from 'vitest';
import { MAX_ROUTINE_STEPS, parseRoutine, parseTriggers } from '../routines';
import { stepActions, type RoutineContext } from '../routineRunner';
import { seededRng } from '../rng';
import { tabletopReducer, type TabletopGameState } from '../tabletopReducer';
import { buildDeck, facesFromImageList } from '../deckBuilder';
import { createWidget } from '../widgetTemplates';
import type { ButtonWidget, CounterWidget, DeckWidget } from '../types';

describe('routines (#449)', () => {
  it('parses valid steps and rejects unknown ops, bad fields and forbidden props', () => {
    expect(
      parseRoutine('[{"op":"SHUFFLE","deck":"d"},{"op":"DRAW","deck":"d","count":2}]'),
    ).toMatchObject({
      ok: true,
    });
    expect(parseRoutine('nope')).toEqual({ ok: false, error: 'invalid_json' });
    expect(parseRoutine('{}')).toEqual({ ok: false, error: 'not_array' });
    expect(parseRoutine([{ op: 'EVAL', code: 'x' }])).toEqual({
      ok: false,
      error: 'unknown_op',
      step: 1,
    });
    expect(parseRoutine([{ op: 'SHUFFLE' }, {}])).toEqual({
      ok: false,
      error: 'missing_field',
      step: 1,
    });
    expect(parseRoutine([{ op: 'DRAW', deck: 'd', count: 999 }])).toMatchObject({
      error: 'bad_count',
    });
    expect(parseRoutine([{ op: 'SET', widget: 'w', props: { type: 'card' } }])).toMatchObject({
      error: 'forbidden_prop',
    });
    expect(
      parseRoutine(Array(MAX_ROUTINE_STEPS + 1).fill({ op: 'SPIN', spinner: 's' })),
    ).toMatchObject({
      error: 'too_many_steps',
    });
  });

  it('turns steps into reducer actions', () => {
    const ctx: RoutineContext = { rng: seededRng(1), seat: null, now: 7, budget: { steps: 9 } };
    const widgets = {
      d: { type: 'deck', cardIds: ['x', 'y', 'z'] },
      a: { type: 'die', sides: 6 },
      b: { type: 'die', sides: 6 },
    } as unknown as Parameters<typeof stepActions>[1];
    const actions = [
      ...stepActions({ op: 'DRAW', deck: 'd', count: 2 }, widgets, ctx),
      ...stepActions({ op: 'ROLL', dice: ['a', 'b'] }, widgets, ctx),
      ...stepActions({ op: 'TIMER', timer: 't', action: 'toggle' }, widgets, ctx),
    ];
    expect(actions.map((a) => a.type)).toEqual([
      'DRAW_CARD',
      'DRAW_CARD',
      'ROLL_DIE',
      'ROLL_DIE',
      'TOGGLE_TIMER',
    ]);
    expect(actions[4]).toMatchObject({ payload: { now: 7 } });
    // the roll result is decided here, not inside the die reducer (ADR-0005)
    expect(actions[2]).toMatchObject({ payload: { value: expect.any(Number) } });
  });

  it('parses the new ops, IF branches and triggers (#694)', () => {
    expect(
      parseRoutine([
        { op: 'DEAL', deck: 'd', count: 5 },
        { op: 'TAKE_FROM_BAG', bag: 'b', count: 2, to: 'h' },
        { op: 'PLACE_IN_HOLDER', widget: 'w', holder: 'h' },
        { op: 'SET_STATE', widget: 'w', state: 1 },
        { op: 'TURN', to: 'previous' },
        { op: 'COUNTER', seat: 'caller', delta: 1 },
        { op: 'ROLL', seat: 'turn' },
        {
          op: 'IF',
          if: { left: { of: 'count', widget: 'd' }, cmp: '==', right: 0 },
          then: [{ op: 'TURN' }],
          else: [{ op: 'DRAW', deck: 'd' }],
        },
      ]),
    ).toMatchObject({ ok: true });
    expect(parseRoutine([{ op: 'DEAL', deck: 'd', count: 0 }])).toMatchObject({
      error: 'bad_count',
    });
    expect(parseRoutine([{ op: 'ROLL' }])).toMatchObject({ error: 'missing_field' });
    expect(parseRoutine([{ op: 'TURN', to: 'up' }])).toMatchObject({ error: 'missing_field' });
    expect(
      parseRoutine([{ op: 'IF', if: { left: { of: 'x' }, cmp: '==', right: 1 }, then: [] }]),
    ).toMatchObject({ error: 'bad_condition', step: 1 });
    const cond = { left: { of: 'turn' }, cmp: '>', right: { of: 'caller' } };
    const nest = (depth: number): unknown =>
      depth === 0 ? { op: 'TURN' } : { op: 'IF', if: cond, then: [nest(depth - 1)] };
    expect(parseRoutine([nest(3)])).toMatchObject({ ok: true });
    expect(parseRoutine([nest(4)])).toMatchObject({ error: 'too_deep' });
    // nested steps count toward the limit
    const many = Array(MAX_ROUTINE_STEPS).fill({ op: 'TURN' });
    expect(parseRoutine([{ op: 'IF', if: cond, then: many }])).toMatchObject({
      error: 'too_many_steps',
    });
    expect(parseRoutine([{ op: 'SET', widget: 'w', props: { triggers: [] } }])).toMatchObject({
      error: 'forbidden_prop',
    });

    expect(
      parseTriggers([
        { on: 'onDrop', holder: 'h' },
        { on: 'onTurnStart' },
        { on: 'onTurnStart', seat: 1 },
        { on: 'onEnterZone', zone: 'z' },
        { on: 'onCounter', counter: 'c' },
      ]),
    ).toMatchObject({ ok: true });
    expect(parseTriggers([{ on: 'onClick' }])).toEqual({
      ok: false,
      error: 'bad_trigger',
      step: 1,
    });
    expect(parseTriggers('{')).toEqual({ ok: false, error: 'invalid_json' });
  });

  it('RUN_ROUTINE applies the button routine in order', () => {
    const deck = buildDeck({
      deckId: 'd',
      x: 0,
      y: 0,
      zIndex: 1,
      width: 80,
      height: 120,
      faces: facesFromImageList('a\nb\nc'),
    });
    const counter = createWidget('counter', 'cnt', 0, 0, 1);
    const button = {
      ...createWidget('button', 'btn', 0, 0, 1),
      routine: [
        { op: 'DRAW', deck: 'd', count: 2, to: undefined },
        { op: 'COUNTER', counter: 'cnt', delta: 5 },
      ],
    } as ButtonWidget;
    const state: TabletopGameState = {
      game: {
        id: 'g',
        name: 'G',
        version: '1',
        minPlayers: 1,
        maxPlayers: 2,
        supportedModes: ['local_pass_and_play'],
        table: { width: 800, height: 600 },
        widgets: Object.fromEntries([...deck, counter, button].map((w) => [w.id, w])),
      },
      flyingCards: [],
    };
    const next = tabletopReducer(state, {
      type: 'RUN_ROUTINE',
      payload: { buttonId: 'btn', now: 0 },
    });
    expect((next.game.widgets.d as DeckWidget).cardIds).toHaveLength(1);
    expect((next.game.widgets.cnt as CounterWidget).value).toBe(5);
    expect(
      tabletopReducer(state, { type: 'RUN_ROUTINE', payload: { buttonId: 'd', now: 0 } }),
    ).toBe(state);
  });
});
