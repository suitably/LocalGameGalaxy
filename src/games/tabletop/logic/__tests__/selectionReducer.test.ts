import { describe, it, expect } from 'vitest';
import { tabletopReducer, type TabletopAction, type TabletopGameState } from '../tabletopReducer';
import type { TabletopGameDefinition, TabletopWidget } from '../types';
import { EMPTY_HISTORY, recordChange, undoStep } from '../editHistory';
import { diffGame } from '../stateDelta';
import { authorizeSeatIntent, type IntentSender } from '../intentAuthorization';
import { acceptIntent } from '../syncProtocol';
import { groupOffset } from '../reducers/selectionReducer';

const w = (id: string, extra: Record<string, unknown>) =>
  ({
    id,
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    zIndex: 1,
    type: 'card',
    faceUp: false,
    ...extra,
  }) as unknown as TabletopWidget;

const game = {
  table: { width: 1000, height: 800 },
  widgets: {
    a: w('a', { x: 100, y: 100 }),
    b: w('b', { x: 300, y: 200, faceUp: true }),
    c: w('c', { x: 500, y: 300, type: 'token', rotation: 350 }),
    pinned: w('pinned', { pinned: true }),
    fixed: w('fixed', { movable: false }),
    mine: w('mine', { x: 0, y: 0 }),
    theirs: w('theirs', { x: 0, y: 0 }),
    h0: w('h0', { type: 'holder', isHand: true, ownerSeat: 0, childIds: ['mine'] }),
    h1: w('h1', { type: 'holder', isHand: true, ownerSeat: 1, childIds: ['theirs'] }),
  },
} as unknown as TabletopGameDefinition;
const state: TabletopGameState = { game, flyingCards: [] };

describe('selection reducer (#701)', () => {
  it('moves a selection by the same offset in one delta and one undo entry', () => {
    const ids = ['a', 'b', 'c'];
    const next = tabletopReducer(state, {
      type: 'MOVE_WIDGETS',
      payload: { ids, dx: 40, dy: -20 },
    });
    for (const id of ids) {
      const before = game.widgets[id];
      expect(next.game.widgets[id]).toMatchObject({ x: before.x + 40, y: before.y - 20 });
    }
    expect(Object.keys(diffGame(game, next.game)?.widgets ?? {}).sort()).toEqual(ids);
    const history = recordChange(EMPTY_HISTORY, game, next.game);
    expect(history.past).toHaveLength(1);
    expect(undoStep(history)?.delta).toBeTruthy();
  });

  it('keeps pinned and unmovable widgets in place and clamps the group to the table', () => {
    const ids = ['a', 'pinned', 'fixed'];
    const next = tabletopReducer(state, { type: 'MOVE_WIDGETS', payload: { ids, dx: 10, dy: 0 } });
    expect(next.game.widgets.a.x).toBe(110);
    expect(next.game.widgets.pinned.x).toBe(100);
    expect(next.game.widgets.fixed.x).toBe(100);
    expect(groupOffset([{ x: 10, y: 0, width: 50, height: 50 }], game.table, -99, 0)).toEqual({
      dx: -10,
      dy: 0,
    });
    const far = tabletopReducer(state, {
      type: 'MOVE_WIDGETS',
      payload: { ids: ['a', 'c'], dx: 9999, dy: 0 },
    });
    // c ends at the right edge; a keeps its distance to c
    expect(far.game.widgets.c.x).toBe(950);
    expect(far.game.widgets.a.x).toBe(550);
    const locked = tabletopReducer(state, {
      type: 'MOVE_WIDGETS',
      payload: { ids: ['pinned'], dx: 5, dy: 5 },
    });
    expect(locked).toBe(state);
  });

  it('flips a mixed selection to one side, in one undo entry', () => {
    const up = tabletopReducer(state, { type: 'FLIP_WIDGETS', payload: { ids: ['a', 'b', 'c'] } });
    expect(up.game.widgets.a).toMatchObject({ faceUp: true, activeFace: 1 });
    expect(up.game.widgets.b).toMatchObject({ faceUp: true });
    expect(up.game.widgets.c).toBe(game.widgets.c);
    const down = tabletopReducer(up, { type: 'FLIP_WIDGETS', payload: { ids: ['a', 'b'] } });
    expect(down.game.widgets.a).toMatchObject({ faceUp: false, activeFace: 0 });
    expect(down.game.widgets.b).toMatchObject({ faceUp: false });
    expect(recordChange(EMPTY_HISTORY, game, up.game).past).toHaveLength(1);
  });

  it('rotates every rotatable widget of the selection by the same angle', () => {
    const next = tabletopReducer(state, {
      type: 'ROTATE_WIDGETS',
      payload: { ids: ['a', 'c', 'c'], deltaDegrees: 90 },
    });
    expect(next.game.widgets.a).toMatchObject({ rotation: 90 });
    expect(next.game.widgets.c).toMatchObject({ rotation: 80 });
    expect(recordChange(EMPTY_HISTORY, game, next.game).past).toHaveLength(1);
  });

  it('deletes a selection in one delta and one undo entry', () => {
    const next = tabletopReducer(state, {
      type: 'DELETE_WIDGETS',
      payload: { ids: ['a', 'b', 'c'] },
    });
    expect(Object.keys(next.game.widgets)).not.toContain('a');
    expect(Object.keys(next.game.widgets)).not.toContain('c');
    expect(recordChange(EMPTY_HISTORY, game, next.game).past).toHaveLength(1);
  });
});

describe('selection authorization (#685, #701)', () => {
  const seat0: IntentSender = { spectator: false, seat: 0 };
  const ok = (a: TabletopAction) => acceptIntent(a, seat0, game);

  it('a phone may batch-act on the table and its own hand, never on another seat', () => {
    const batches = (ids: string[]): TabletopAction[] => [
      { type: 'MOVE_WIDGETS', payload: { ids, dx: 1, dy: 1 } },
      { type: 'FLIP_WIDGETS', payload: { ids } },
      { type: 'ROTATE_WIDGETS', payload: { ids, deltaDegrees: 90 } },
    ];
    for (const action of batches(['a', 'b', 'mine'])) expect(ok(action)).toBe(true);
    for (const action of batches(['a', 'theirs'])) expect(ok(action)).toBe(false);
    for (const action of batches(['h1'])) expect(ok(action)).toBe(false);
  });

  it('a phone cannot delete a multi-selection containing widgets it does not own', () => {
    const del: TabletopAction = {
      type: 'DELETE_WIDGETS',
      payload: { ids: ['a', 'mine', 'theirs'] },
    };
    expect(authorizeSeatIntent(del, seat0, game)).toBe(false);
    expect(ok(del)).toBe(false);
    // even a selection of only its own widgets stays host-only
    expect(ok({ type: 'DELETE_WIDGETS', payload: { ids: ['mine'] } })).toBe(false);
  });
});
