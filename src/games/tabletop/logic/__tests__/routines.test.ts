import { describe, it, expect } from 'vitest';
import { MAX_ROUTINE_STEPS, parseRoutine, routineToActions } from '../routines';
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
    const actions = routineToActions(
      [
        { op: 'DRAW', deck: 'd', count: 2 },
        { op: 'ROLL', dice: ['a', 'b'] },
        { op: 'TIMER', timer: 't', action: 'toggle' },
      ],
      7,
    );
    expect(actions.map((a) => a.type)).toEqual([
      'DRAW_CARD',
      'DRAW_CARD',
      'ROLL_DIE',
      'ROLL_DIE',
      'TOGGLE_TIMER',
    ]);
    expect(actions[4]).toMatchObject({ payload: { now: 7 } });
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
