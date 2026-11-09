import { describe, it, expect, vi } from 'vitest';
import { tabletopReducer, type TabletopAction, type TabletopGameState } from '../tabletopReducer';
import { EMPTY_HISTORY, recordChange, undoStep, type EditHistory } from '../editHistory';
import { composeDeltas } from '../stateDelta';
import { buildMembershipSets, filterBoardWidgets, isCardInDeck, isItemInBag } from '../boardFilter';
import { isCardInHand } from '../handLayout';
import { createMoveCoalescer, type CoalescedMove } from '../moveCoalescer';
import type { TabletopWidget } from '../types';

const w = (id: string, type: string, fields: Record<string, unknown> = {}) =>
  ({ id, type, x: 10, y: 10, width: 50, height: 50, zIndex: 1, ...fields }) as TabletopWidget;

const table = (widgets: TabletopWidget[]): TabletopGameState => ({
  game: {
    id: 'g',
    name: 'G',
    version: '1',
    minPlayers: 1,
    maxPlayers: 4,
    supportedModes: ['local_pass_and_play'],
    table: { width: 1000, height: 800 },
    widgets: Object.fromEntries(widgets.map((x) => [x.id, x])),
  },
  flyingCards: [],
});

describe('buildMembershipSets (#684)', () => {
  const widgets = table([
    w('deck', 'deck', { cardIds: ['c1', 'c2'] }),
    w('bag', 'bag', { itemIds: ['t1'] }),
    w('hand', 'holder', { isHand: true, childIds: ['c3'] }),
    w('discard', 'holder', { childIds: ['c4'] }),
    ...['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => w(id, 'card')),
    w('t1', 'token'),
    w('t2', 'token'),
  ]).game.widgets;

  it('matches the per-widget checks for every widget', () => {
    const sets = buildMembershipSets(widgets);
    for (const id of Object.keys(widgets)) {
      expect(sets.inDeck.has(id)).toBe(isCardInDeck(id, widgets));
      expect(sets.inHand.has(id)).toBe(isCardInHand(id, widgets));
      expect(sets.inBag.has(id)).toBe(isItemInBag(id, widgets));
    }
  });

  it('filterBoardWidgets hides deck, hand and bag members and keeps the rest', () => {
    const visible = new Set(Object.keys(widgets));
    expect(
      filterBoardWidgets(widgets, visible)
        .map((x) => x.id)
        .sort(),
    ).toEqual(['bag', 'c4', 'c5', 'deck', 't2']);
    expect(filterBoardWidgets(widgets, visible, true).map((x) => x.id)).toContain('c3');
  });
});

describe('createMoveCoalescer (#684)', () => {
  const setup = () => {
    let time = 0;
    const timers: { fn: () => void; at: number }[] = [];
    const emitted: CoalescedMove[] = [];
    const coalescer = createMoveCoalescer({
      emit: (m) => emitted.push(m),
      now: () => time,
      setTimer: (fn, ms) => timers.push({ fn, at: time + ms }) - 1,
      clearTimer: (h) => {
        timers[h as number] = { fn: () => {}, at: Infinity };
      },
    });
    const advance = (ms: number) => {
      time += ms;
      timers.forEach((t, i) => {
        if (t.at <= time) {
          timers[i] = { fn: () => {}, at: Infinity };
          t.fn();
        }
      });
    };
    return { coalescer, emitted, advance };
  };
  const move = (x: number): CoalescedMove => ({ id: 'a', x, y: 0 });

  it('emits the first move at once and then at most one move per 50 ms', () => {
    const { coalescer, emitted, advance } = setup();
    // 60 fps for one second: 60 pointer moves
    for (let i = 0; i < 60; i++) {
      coalescer.push(move(i));
      advance(1000 / 60);
    }
    expect(emitted[0]).toEqual(move(0));
    expect(emitted.length).toBeLessThanOrEqual(21);
    expect(emitted.length).toBeGreaterThanOrEqual(15);
  });

  it('flush emits the pending move and returns the drop position', () => {
    const { coalescer, emitted, advance } = setup();
    coalescer.push(move(1));
    advance(10);
    coalescer.push(move(2));
    expect(coalescer.flush()).toEqual(move(2));
    expect(emitted).toEqual([move(1), move(2)]);
    advance(100);
    expect(emitted).toHaveLength(2);
    expect(coalescer.flush()).toBeNull();
  });

  it('skips a move equal to the last emitted one; cancel drops the pending move', () => {
    const { coalescer, emitted, advance } = setup();
    coalescer.push(move(1));
    advance(10);
    coalescer.push(move(1));
    coalescer.flush();
    expect(emitted).toEqual([move(1)]);
    coalescer.push(move(5));
    advance(10);
    coalescer.push(move(6));
    coalescer.cancel();
    advance(100);
    expect(emitted).toEqual([move(1), move(5)]);
  });

  it('uses real timers by default', () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const coalescer = createMoveCoalescer({ emit });
    coalescer.push(move(1));
    coalescer.push(move(2));
    expect(emit).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60);
    expect(emit).toHaveBeenLastCalledWith(move(2));
    vi.useRealTimers();
  });
});

describe('one undo entry per drag (#684)', () => {
  /** Runs actions like the editor does: every game change is recorded with the state's gesture. */
  const play = (start: TabletopGameState, actions: TabletopAction[]) => {
    let s = start;
    let history: EditHistory = EMPTY_HISTORY;
    for (const action of actions) {
      const next = tabletopReducer(s, action);
      if (next.game !== s.game)
        history = recordChange(history, s.game, next.game, undefined, next.gesture);
      s = next;
    }
    return { s, history };
  };
  const start = table([
    w('a', 'token'),
    w('b', 'token', { zIndex: 2 }),
    w('tray', 'holder', { childIds: [] }),
  ]);
  const drag = (gesture: string, xs: number[]): TabletopAction[] =>
    xs.map((x) => ({ type: 'MOVE_WIDGET', payload: { id: 'a', x, y: x, gesture } }));

  it('merges every move and the snap of one gesture; undo restores the start', () => {
    const { s, history } = play(start, [
      ...drag('g1', [20, 30, 40, 50]),
      { type: 'SNAP_TO_HOLDER', payload: { widgetId: 'a', holderId: 'tray', gesture: 'g1' } },
    ]);
    expect(history.past).toHaveLength(1);
    const undone = tabletopReducer(s, {
      type: 'APPLY_EDIT_DELTA',
      payload: undoStep(history)!.delta,
    });
    expect(undone.game.widgets).toEqual(start.game.widgets);
    expect(undone.gesture).toBeUndefined();
  });

  it('keeps separate drags and untagged changes apart', () => {
    const { history } = play(start, [
      ...drag('g1', [20, 30]),
      { type: 'FLIP_CARD', payload: { cardId: 'a' } },
      { type: 'PATCH_WIDGETS', payload: { patches: { b: { x: 99 } } } },
      ...drag('g2', [60, 70]),
      { type: 'MOVE_WIDGET', payload: { id: 'a', x: 1, y: 1 } },
    ]);
    expect(history.past).toHaveLength(4);
    expect(history.past.map((e) => e.gesture)).toEqual(['g1', undefined, 'g2', undefined]);
  });

  it('composeDeltas lets the later delta win and merges fields', () => {
    const a = w('a', 'token');
    const moved = { ...a, x: 5 } as TabletopWidget;
    expect(
      composeDeltas(
        { widgets: { a, b: null }, fields: { name: 'x' } },
        { widgets: { a: moved }, fields: { ruleText: 'r' } },
      ),
    ).toEqual({ widgets: { a: moved, b: null }, fields: { name: 'x', ruleText: 'r' } });
    expect(composeDeltas({ widgets: {} }, { widgets: { a } })).toEqual({ widgets: { a } });
  });
});
