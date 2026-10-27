import { describe, it, expect } from 'vitest';
import { compactZ, raiseToTopZ, raiseWidget, reorderWidgets, Z_RENUMBER_LIMIT } from '../zOrder';
import { tabletopReducer, type TabletopGameState } from '../tabletopReducer';
import type { TabletopWidget } from '../types';

const w = (id: string, zIndex: number, x = 0, extra: Partial<TabletopWidget> = {}) =>
  ({ id, type: 'token', x, y: 0, width: 100, height: 100, zIndex, ...extra }) as TabletopWidget;

const table = (...list: TabletopWidget[]) => Object.fromEntries(list.map((x) => [x.id, x]));

const apply = (widgets: Record<string, TabletopWidget>, changes: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(widgets).map(([id, x]) => [id, { ...x, zIndex: changes[id] ?? x.zIndex }]),
  );

const order = (widgets: Record<string, TabletopWidget>) =>
  Object.values(widgets)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((x) => x.id);

const base = () => table(w('a', 1), w('b', 2), w('c', 3));

describe('zOrder', () => {
  it('front and back move past everything and are no-ops at the edge', () => {
    expect(order(apply(base(), reorderWidgets(base(), ['a'], 'front')))).toEqual(['b', 'c', 'a']);
    expect(order(apply(base(), reorderWidgets(base(), ['c'], 'back')))).toEqual(['c', 'a', 'b']);
    expect(reorderWidgets(base(), ['c'], 'front')).toEqual({});
    expect(reorderWidgets(base(), ['a'], 'back')).toEqual({});
  });

  it('forward and backward pass only the next overlapping widget', () => {
    const widgets = table(w('a', 1, 0), w('far', 2, 500), w('b', 3, 50), w('c', 4, 60));
    const up = apply(widgets, reorderWidgets(widgets, ['a'], 'forward'));
    expect(order(up)).toEqual(['far', 'b', 'a', 'c']);
    const down = apply(widgets, reorderWidgets(widgets, ['c'], 'backward'));
    expect(order(down)).toEqual(['a', 'far', 'c', 'b']);
  });

  it('does nothing when no widget overlaps', () => {
    const widgets = table(w('a', 1, 0), w('b', 2, 500));
    expect(reorderWidgets(widgets, ['a'], 'forward')).toEqual({});
  });

  it('keeps the internal order of a multi-selection', () => {
    const widgets = table(w('a', 1), w('b', 2), w('c', 3), w('d', 4));
    expect(order(apply(widgets, reorderWidgets(widgets, ['b', 'a'], 'front')))).toEqual([
      'c',
      'd',
      'a',
      'b',
    ]);
    expect(order(apply(widgets, reorderWidgets(widgets, ['c', 'd'], 'back')))).toEqual([
      'c',
      'd',
      'a',
      'b',
    ]);
  });

  it('ignores widgets inside a holder and unknown ids', () => {
    const widgets = table(w('a', 1), w('b', 2), w('child', 9, 0, { parent: 'h' }));
    expect(raiseToTopZ(widgets, 'a')).toBe(3);
    expect(reorderWidgets(widgets, ['nope'], 'front')).toEqual({});
  });

  it('raiseWidget puts a widget on top and renumbers an overgrown stack', () => {
    expect(raiseWidget(base(), 'a').a.zIndex).toBe(4);
    expect(raiseWidget(base(), 'c')).toEqual(base());
    const tall = table(w('a', 1), w('b', Z_RENUMBER_LIMIT + 5));
    const raised = raiseWidget(tall, 'a');
    expect(raised.b.zIndex).toBe(2);
    expect(raised.a.zIndex).toBe(3);
    expect(compactZ(tall)).toEqual({ b: 2 });
  });
});

describe('tabletopReducer z-order', () => {
  const state = (): TabletopGameState =>
    ({
      game: { id: 'g', table: { width: 1000, height: 800 }, widgets: base() },
      flyingCards: [],
    }) as unknown as TabletopGameState;

  it('MOVE_WIDGET raises the moved widget to the top', () => {
    const next = tabletopReducer(state(), {
      type: 'MOVE_WIDGET',
      payload: { id: 'a', x: 5, y: 5 },
    });
    expect(next.game.widgets.a.zIndex).toBe(4);
  });

  it('MOVE_WIDGET keeps an explicit zIndex', () => {
    const next = tabletopReducer(state(), {
      type: 'MOVE_WIDGET',
      payload: { id: 'a', x: 5, y: 5, zIndex: 1 },
    });
    expect(next.game.widgets.a.zIndex).toBe(1);
  });

  it('MOVE_WIDGET leaves a keepZOrder widget on its layer (#548)', () => {
    const s0 = state();
    s0.game.widgets.a = { ...s0.game.widgets.a, keepZOrder: true };
    const next = tabletopReducer(s0, { type: 'MOVE_WIDGET', payload: { id: 'a', x: 5, y: 5 } });
    expect(next.game.widgets.a.zIndex).toBe(1);
    expect(next.game.widgets.a.x).toBe(5);
  });

  it('SET_Z_ORDER sends to back and sticks until the widget is moved again', () => {
    const back = tabletopReducer(state(), {
      type: 'SET_Z_ORDER',
      payload: { widgetIds: ['c'], op: 'back' },
    });
    expect(order(back.game.widgets)).toEqual(['c', 'a', 'b']);
    const moved = tabletopReducer(back, { type: 'MOVE_WIDGET', payload: { id: 'c', x: 1, y: 1 } });
    expect(order(moved.game.widgets)[2]).toBe('c');
  });

  it('SET_Z_ORDER returns the same state when nothing changes', () => {
    const s = state();
    expect(
      tabletopReducer(s, { type: 'SET_Z_ORDER', payload: { widgetIds: ['c'], op: 'front' } }),
    ).toBe(s);
  });
});
