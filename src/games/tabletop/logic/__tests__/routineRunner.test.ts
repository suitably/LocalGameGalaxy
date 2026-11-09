import { describe, it, expect } from 'vitest';
import { tabletopReducer } from '../tabletopReducer';
import type {
  CounterWidget,
  DeckWidget,
  DieWidget,
  HolderWidget,
  SeatWidget,
  TabletopWidget,
} from '../types';
import { button, hand, run, table, wid } from './routineFixture';

const cards = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const deckTable = (routine: unknown[]) =>
  table([
    wid('deck', { type: 'deck', cardIds: cards, backContent: { type: 'text', value: '' } }),
    ...cards.map((id) => wid(id, { type: 'card', faceUp: false, rotation: 0 })),
    hand('h0', 0),
    hand('h1', 1),
    button('b', routine),
  ]);
const ids = (w: TabletopWidget) => (w as HolderWidget).childIds;

describe('routine ops (#694)', () => {
  it('DEAL gives every hand n cards, round robin in seat order', () => {
    const next = tabletopReducer(deckTable([{ op: 'DEAL', deck: 'deck', count: 2 }]), run('b'));
    // drawn from the top (end of `cardIds`)
    expect(ids(next.game.widgets.h0)).toEqual(['c6', 'c4']);
    expect(ids(next.game.widgets.h1)).toEqual(['c5', 'c3']);
    expect((next.game.widgets.deck as DeckWidget).cardIds).toEqual(['c1', 'c2']);
  });

  it('SHUFFLE takes its order from the host seed: same seed, same table', () => {
    const state = deckTable([{ op: 'SHUFFLE', deck: 'deck' }]);
    const a = tabletopReducer(state, run('b', 0, 7));
    const b = tabletopReducer(state, run('b', 0, 7));
    const order = (a.game.widgets.deck as DeckWidget).cardIds;
    expect(order).toEqual((b.game.widgets.deck as DeckWidget).cardIds);
    expect([...order].sort()).toEqual(cards);
  });

  it('TAKE_FROM_BAG spawns pieces with host-decided ids into a holder', () => {
    const state = table([
      wid('bag', { type: 'bag', isInfinite: true, templateWidget: wid('t', { type: 'token' }) }),
      wid('tray', { type: 'holder', childIds: [], layout: 'grid', width: 200 }),
      button('b', [{ op: 'TAKE_FROM_BAG', bag: 'bag', count: 2, to: 'tray' }]),
    ]);
    const next = tabletopReducer(state, run('b'));
    const spawned = ids(next.game.widgets.tray);
    expect(spawned).toHaveLength(2);
    expect(new Set(spawned).size).toBe(2);
    expect(ids(tabletopReducer(state, run('b')).game.widgets.tray)).toEqual(spawned);
  });

  it('PLACE_IN_HOLDER and SET_STATE', () => {
    const state = table([
      wid('tok', { type: 'token', states: [{ color: 'red' }, { color: 'blue' }], stateIndex: 0 }),
      wid('box', { type: 'holder', childIds: [], layout: 'grid' }),
      button('b', [
        { op: 'PLACE_IN_HOLDER', widget: 'tok', holder: 'box' },
        { op: 'SET_STATE', widget: 'tok', state: 1 },
      ]),
    ]);
    const next = tabletopReducer(state, run('b'));
    expect(ids(next.game.widgets.box)).toEqual(['tok']);
    expect(next.game.widgets.tok).toMatchObject({ stateIndex: 1, color: 'blue' });
  });

  it('TURN writes seat.turn: next, previous, caller; hands-only games get seats first', () => {
    const seats = [0, 1, 2].map((i) => wid(`s${i}`, { type: 'seat', index: i, color: '' }));
    const turnOf = (w: Record<string, TabletopWidget>) =>
      Object.values(w)
        .filter((s): s is SeatWidget => s.type === 'seat' && Boolean((s as SeatWidget).turn))
        .map((s) => s.index);
    const go = (routine: unknown[], widgets = seats, seat = 1) =>
      tabletopReducer(table([...widgets, button('b', routine)]), run('b', seat)).game.widgets;

    expect(turnOf(go([{ op: 'TURN' }]))).toEqual([0]);
    expect(turnOf(go([{ op: 'TURN' }, { op: 'TURN' }, { op: 'TURN' }, { op: 'TURN' }]))).toEqual([
      0,
    ]);
    expect(turnOf(go([{ op: 'TURN', to: 'previous' }]))).toEqual([2]);
    expect(turnOf(go([{ op: 'TURN', to: 'caller' }]))).toEqual([1]);
    // hands only (built-in card deck): one seat per hand, then the turn moves
    const auto = go([{ op: 'TURN' }, { op: 'TURN' }], [hand('h0', 0), hand('h1', 1)]);
    expect(turnOf(auto)).toEqual([1]);
    expect(auto.seat_auto_0).toMatchObject({ type: 'seat', hand: 'h0', turn: false });
  });

  it('ROLL and COUNTER per seat touch only that seat (caller is the host-resolved sender)', () => {
    const dice = ['a', 'a2', 'x'].map((id) => wid(id, { type: 'die', sides: 6, currentValue: 0 }));
    const state = table([
      ...dice,
      hand('cup0', 0, ['a', 'a2']),
      hand('cup1', 1, ['x']),
      wid('score0', { type: 'counter', value: 0, step: 1, ownerSeat: 0 }),
      wid('score1', { type: 'counter', value: 0, step: 1, ownerSeat: 1 }),
      button('b', [
        { op: 'ROLL', seat: 'caller' },
        { op: 'COUNTER', seat: 'caller', delta: 3 },
      ]),
    ]);
    const next = tabletopReducer(state, run('b', 0)).game.widgets;
    const value = (id: string) => (next[id] as DieWidget).currentValue;
    expect(value('a')).toBeGreaterThan(0);
    expect(value('a2')).toBeGreaterThan(0);
    expect(value('x')).toBe(0);
    expect((next.score0 as CounterWidget).value).toBe(3);
    expect((next.score1 as CounterWidget).value).toBe(0);
    // a sender without seat rolls nothing
    expect(tabletopReducer(state, run('b', null))).toBe(state);
  });

  it('IF runs then/else from the table as the earlier steps left it', () => {
    const ifEmpty = (then: unknown[], otherwise: unknown[]) => ({
      op: 'IF',
      if: { left: { of: 'count', widget: 'deck' }, cmp: '==', right: 0 },
      then,
      else: otherwise,
    });
    const seat = wid('s0', { type: 'seat', index: 0, color: '' });
    const go = (routine: unknown[]) =>
      tabletopReducer(table([...Object.values(deckTable(routine).game.widgets), seat]), run('b'))
        .game.widgets;
    const emptied = go([
      { op: 'DRAW', deck: 'deck', count: 6, to: 'h0' },
      ifEmpty([{ op: 'TURN' }], [{ op: 'DRAW', deck: 'deck', to: 'h1' }]),
    ]);
    expect(ids(emptied.h0)).toHaveLength(6);
    expect(emptied.s0).toMatchObject({ turn: true });
    const full = go([ifEmpty([{ op: 'TURN' }], [{ op: 'DRAW', deck: 'deck', to: 'h1' }])]);
    expect(ids(full.h1)).toHaveLength(1);
    expect((full.s0 as SeatWidget).turn).toBeUndefined();
  });
});
