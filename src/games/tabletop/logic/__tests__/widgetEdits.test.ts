import { describe, it, expect } from 'vitest';
import { tabletopReducer, type TabletopGameState } from '../tabletopReducer';
import { cloneWidget, parseWidgetPatch } from '../widgetEdits';
import { EMPTY_HISTORY, recordChange, redoStep, undoStep } from '../editHistory';
import type { DeckWidget, HolderWidget, TabletopWidget } from '../types';

const base = (id: string, type: string, fields: Record<string, unknown> = {}) =>
  ({
    id,
    type,
    x: 10,
    y: 10,
    width: 80,
    height: 120,
    zIndex: 1,
    ...fields,
  }) as unknown as TabletopWidget;

const state = (widgets: TabletopWidget[]): TabletopGameState => ({
  game: {
    id: 'g',
    name: 'G',
    version: '1',
    minPlayers: 1,
    maxPlayers: 4,
    supportedModes: ['local_pass_and_play'],
    table: { width: 1000, height: 800 },
    widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
  },
  flyingCards: [],
});

describe('editor actions (#449)', () => {
  it('PATCH_WIDGETS merges fields but never id or type', () => {
    const next = tabletopReducer(state([base('t', 'token')]), {
      type: 'PATCH_WIDGETS',
      payload: { patches: { t: { x: 99, label: 'Hi' }, missing: { x: 1 } } },
    });
    expect(next.game.widgets.t).toMatchObject({ id: 't', type: 'token', x: 99, label: 'Hi' });
    expect(next.game.widgets.missing).toBeUndefined();
  });

  it('ADD_WIDGET adds once; an unchanged game keeps the same state object', () => {
    const s = state([base('t', 'token')]);
    expect(
      tabletopReducer(s, { type: 'ADD_WIDGET', payload: { widget: base('t', 'token') } }),
    ).toBe(s);
    const added = tabletopReducer(s, {
      type: 'ADD_WIDGET',
      payload: { widget: base('u', 'token') },
    });
    expect(Object.keys(added.game.widgets)).toEqual(['t', 'u']);
  });

  it('DELETE_WIDGETS removes deck cards and holder references', () => {
    const s = state([
      base('d', 'deck', { cardIds: ['c1'], cardCount: 1 }),
      base('c1', 'card'),
      base('c2', 'card', { parent: 'h' }),
      base('h', 'holder', { childIds: ['c2'] }),
    ]);
    const next = tabletopReducer(s, { type: 'DELETE_WIDGETS', payload: { ids: ['d', 'c2'] } });
    expect(Object.keys(next.game.widgets)).toEqual(['h']);
    expect((next.game.widgets.h as HolderWidget).childIds).toEqual([]);
  });

  it('DELETE_WIDGETS of a single card updates its deck', () => {
    const s = state([
      base('d', 'deck', { cardIds: ['c1', 'c2'], cardCount: 2 }),
      base('c1', 'card'),
      base('c2', 'card'),
    ]);
    const next = tabletopReducer(s, { type: 'DELETE_WIDGETS', payload: { ids: ['c1'] } });
    expect(next.game.widgets.d as DeckWidget).toMatchObject({ cardIds: ['c2'], cardCount: 2 - 1 });
  });

  it('cloneWidget copies outside holders and refuses decks and taken ids', () => {
    const s = state([
      base('h', 'holder', { childIds: ['x'], parent: 'p' }),
      base('d', 'deck', { cardIds: [] }),
    ]);
    expect(cloneWidget(s.game, 'h', 'h2')).toMatchObject({
      id: 'h2',
      x: 30,
      y: 30,
      childIds: [],
      parent: undefined,
    });
    expect(cloneWidget(s.game, 'd', 'd2')).toBeNull();
    expect(cloneWidget(s.game, 'h', 'd')).toBeNull();
  });

  it('UPDATE_TABLE changes only the given table fields', () => {
    const next = tabletopReducer(state([]), {
      type: 'UPDATE_TABLE',
      payload: { changes: { backgroundColor: '#123' } },
    });
    expect(next.game.table).toEqual({ width: 1000, height: 800, backgroundColor: '#123' });
  });
});

describe('editHistory (#449)', () => {
  it('undo and redo round-trip an edit through APPLY_EDIT_DELTA', () => {
    const before = state([base('t', 'token')]);
    const after = tabletopReducer(before, {
      type: 'PATCH_WIDGETS',
      payload: { patches: { t: { x: 500 } } },
    });
    let history = recordChange(EMPTY_HISTORY, before.game, after.game);

    const undo = undoStep(history)!;
    const undone = tabletopReducer(after, { type: 'APPLY_EDIT_DELTA', payload: undo.delta });
    expect(undone.game.widgets.t.x).toBe(10);
    history = undo.history;

    const redo = redoStep(history)!;
    const redone = tabletopReducer(undone, { type: 'APPLY_EDIT_DELTA', payload: redo.delta });
    expect(redone.game.widgets.t.x).toBe(500);
    expect(undoStep(EMPTY_HISTORY)).toBeNull();
    expect(redoStep(redo.history)).toBeNull();
  });

  it('a new change clears redo; no-op changes are not recorded; the limit drops the oldest', () => {
    const a = state([base('t', 'token')]).game;
    const b = { ...a, widgets: { t: { ...a.widgets.t, x: 1 } } };
    const c = { ...b, widgets: { t: { ...b.widgets.t, x: 2 } } };
    expect(recordChange(EMPTY_HISTORY, a, a)).toBe(EMPTY_HISTORY);
    const h = undoStep(recordChange(EMPTY_HISTORY, a, b))!.history;
    expect(recordChange(h, a, c).future).toEqual([]);
    expect(recordChange(recordChange(EMPTY_HISTORY, a, b, 1), b, c, 1).past).toHaveLength(1);
  });
});

describe('parseWidgetPatch (#449)', () => {
  it('accepts JSON objects only', () => {
    expect(parseWidgetPatch('{"x": 5}')).toEqual({ x: 5 });
    expect(parseWidgetPatch('[1]')).toBeNull();
    expect(parseWidgetPatch('nope')).toBeNull();
    expect(parseWidgetPatch('null')).toBeNull();
  });
});
