import { describe, it, expect } from 'vitest';
import { tabletopReducer, type TabletopGameState } from '../tabletopReducer';
import type { CardWidget, HolderWidget, TabletopWidget } from '../types';

const card = (id: string, fields: Partial<CardWidget> = {}): CardWidget =>
  ({
    id,
    type: 'card',
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    zIndex: 1,
    faceUp: true,
    rotation: 0,
    frontContent: { type: 'text', value: id },
    backContent: { type: 'text', value: '?' },
    ...fields,
  }) as CardWidget;

const holder = (fields: Partial<HolderWidget>): HolderWidget =>
  ({
    id: 'h',
    type: 'holder',
    x: 100,
    y: 200,
    width: 400,
    height: 160,
    zIndex: 50,
    childIds: [],
    isHand: false,
    ...fields,
  }) as HolderWidget;

const stateWith = (widgets: TabletopWidget[]): TabletopGameState => ({
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

/** Snaps c1..cN one after another and returns their positions. */
function snapAll(h: HolderWidget, count: number) {
  const cards = Array.from({ length: count }, (_, i) => card(`c${i + 1}`));
  let state = stateWith([h, ...cards]);
  for (const c of cards) {
    state = tabletopReducer(state, {
      type: 'SNAP_TO_HOLDER',
      payload: { widgetId: c.id, holderId: h.id },
    });
  }
  return cards.map((c) => {
    const w = state.game.widgets[c.id];
    return [w.x, w.y, w.zIndex, w.parent];
  });
}

describe('holder layout via SNAP_TO_HOLDER (#414 characterisation)', () => {
  it('stack offsets each card diagonally', () => {
    expect(snapAll(holder({ layout: 'stack' }), 3)).toMatchInlineSnapshot(`
      [
        [
          260,
          220,
          60,
          "h",
        ],
        [
          262,
          222,
          60,
          "h",
        ],
        [
          264,
          224,
          60,
          "h",
        ],
      ]
    `);
  });

  it('fan spreads all cards', () => {
    expect(snapAll(holder({ layout: 'fan' }), 3)).toMatchInlineSnapshot(`
      [
        [
          116,
          220,
          60,
          "h",
        ],
        [
          212,
          220,
          61,
          "h",
        ],
        [
          308,
          220,
          62,
          "h",
        ],
      ]
    `);
  });

  it('grid wraps into rows', () => {
    expect(snapAll(holder({ layout: 'grid', width: 200 }), 3)).toMatchInlineSnapshot(`
      [
        [
          160,
          220,
          60,
          "h",
        ],
        [
          244,
          220,
          60,
          "h",
        ],
        [
          160,
          344,
          60,
          "h",
        ],
      ]
    `);
  });

  it('hand re-lays all cards', () => {
    expect(snapAll(holder({ isHand: true, ownerSeat: 0 }), 3)).toMatchInlineSnapshot(`
      [
        [
          124,
          220,
          60,
          "h",
        ],
        [
          126,
          218,
          61,
          "h",
        ],
        [
          128,
          216,
          62,
          "h",
        ],
      ]
    `);
  });

  it('removing a card re-lays the remaining hand', () => {
    const h = holder({ isHand: true, ownerSeat: 0 });
    let state = stateWith([h, card('c1'), card('c2'), card('c3')]);
    for (const id of ['c1', 'c2', 'c3']) {
      state = tabletopReducer(state, {
        type: 'SNAP_TO_HOLDER',
        payload: { widgetId: id, holderId: 'h' },
      });
    }
    state = tabletopReducer(state, {
      type: 'MOVE_WIDGET',
      payload: { id: 'c1', x: 0, y: 0 },
    });
    expect((state.game.widgets.h as HolderWidget).childIds).toEqual(['c2', 'c3']);
    expect(['c2', 'c3'].map((id) => state.game.widgets[id].x)).toMatchInlineSnapshot(`
      [
        126,
        128,
      ]
    `);
  });
});
