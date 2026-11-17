import { describe, it, expect } from 'vitest';
import { tabletopReducer, type TabletopGameState } from '../tabletopReducer';
import { findStackTargetAt, withFanCards, type BoardDeck } from '../boardFilter';
import type { StackDeck } from '../reducers/stackReducer';
import type { CardWidget, DeckWidget, HolderWidget, TabletopWidget } from '../types';

const card = (id: string, x: number, y: number, extra: Partial<CardWidget> = {}): CardWidget => ({
  id,
  type: 'card',
  x,
  y,
  width: 80,
  height: 120,
  zIndex: 5,
  faceUp: true,
  rotation: 0,
  frontContent: { type: 'text', value: id },
  backContent: { type: 'text', value: 'back' },
  ...extra,
});

const stateOf = (...widgets: TabletopWidget[]): TabletopGameState =>
  ({
    game: {
      id: 'g',
      name: 'g',
      version: '1',
      minPlayers: 1,
      maxPlayers: 2,
      supportedModes: ['local_pass_and_play'],
      table: { width: 1000, height: 800 },
      widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
    },
  }) as TabletopGameState;

describe('STACK_CARDS', () => {
  it('builds a pile deck with the dropped card on top', () => {
    const s = tabletopReducer(stateOf(card('a', 100, 100), card('b', 300, 300)), {
      type: 'STACK_CARDS',
      payload: { cardId: 'b', targetId: 'a' },
    });
    const deck = s.game.widgets.stack_a as StackDeck;
    expect(deck).toMatchObject({ type: 'deck', isPile: true, stackDisplay: 'pile', cardCount: 2 });
    expect(deck.cardIds).toEqual(['a', 'b']);
    expect([deck.x, deck.y]).toEqual([100, 100]);
    expect(s.game.widgets.a).toMatchObject({ inPile: true, pileId: 'stack_a' });
    expect(s.game.widgets.b).toMatchObject({ inPile: true, pileId: 'stack_a', x: 100, y: 100 });
    expect(deck.frontContent).toEqual({ type: 'text', value: 'b' });
  });

  it('takes both cards out of their holders', () => {
    const holder = {
      id: 'h',
      type: 'holder',
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      zIndex: 1,
      dropTargetTypes: ['card'],
      childIds: ['a', 'b'],
      layout: 'stack',
    } as HolderWidget;
    const s = tabletopReducer(stateOf(holder, card('a', 10, 10), card('b', 20, 20)), {
      type: 'STACK_CARDS',
      payload: { cardId: 'b', targetId: 'a' },
    });
    expect((s.game.widgets.h as HolderWidget).childIds).toEqual([]);
  });

  it('ignores itself, pile cards and non-cards; a second stack gets a new id', () => {
    const base = stateOf(card('a', 0, 0), card('b', 0, 0), card('c', 0, 0));
    const same = tabletopReducer(base, {
      type: 'STACK_CARDS',
      payload: { cardId: 'a', targetId: 'a' },
    });
    expect(same).toBe(base);
    const once = tabletopReducer(base, {
      type: 'STACK_CARDS',
      payload: { cardId: 'b', targetId: 'a' },
    });
    const pileCard = tabletopReducer(once, {
      type: 'STACK_CARDS',
      payload: { cardId: 'c', targetId: 'b' },
    });
    expect(pileCard).toBe(once);
    const missing = tabletopReducer(base, {
      type: 'STACK_CARDS',
      payload: { cardId: 'c', targetId: 'nope' },
    });
    expect(missing).toBe(base);
  });

  it('a card dropped on a stack deck joins it (existing snap)', () => {
    const stacked = tabletopReducer(stateOf(card('a', 0, 0), card('b', 0, 0), card('c', 400, 0)), {
      type: 'STACK_CARDS',
      payload: { cardId: 'b', targetId: 'a' },
    });
    const s = tabletopReducer(stacked, {
      type: 'SNAP_TO_HOLDER',
      payload: { widgetId: 'c', holderId: 'stack_a' },
    });
    expect((s.game.widgets.stack_a as StackDeck).cardIds).toEqual(['a', 'b', 'c']);
  });
});

describe('SET_STACK_DISPLAY and fan view', () => {
  const stacked = tabletopReducer(stateOf(card('a', 0, 0), card('b', 0, 0)), {
    type: 'STACK_CARDS',
    payload: { cardId: 'b', targetId: 'a' },
  });

  it('toggles the display of a pile deck only', () => {
    const fan = tabletopReducer(stacked, {
      type: 'SET_STACK_DISPLAY',
      payload: { deckId: 'stack_a', display: 'fan' },
    });
    expect((fan.game.widgets.stack_a as StackDeck).stackDisplay).toBe('fan');
    const notPile = stateOf({
      id: 'd',
      type: 'deck',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      zIndex: 1,
      cardIds: [],
      backContent: { type: 'text', value: '' },
    } as DeckWidget);
    expect(
      tabletopReducer(notPile, {
        type: 'SET_STACK_DISPLAY',
        payload: { deckId: 'd', display: 'fan' },
      }),
    ).toBe(notPile);
  });

  it('withFanCards adds the cards of fanned stacks only', () => {
    const all = stacked.game.widgets;
    expect((withFanCards([all.stack_a], all)[0] as BoardDeck).fanCards).toBeUndefined();
    const fan = tabletopReducer(stacked, {
      type: 'SET_STACK_DISPLAY',
      payload: { deckId: 'stack_a', display: 'fan' },
    }).game.widgets;
    const out = withFanCards([fan.stack_a], fan)[0] as BoardDeck;
    expect(out.fanCards?.map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('findStackTargetAt', () => {
  const inHolder = {
    id: 'h',
    type: 'holder',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    zIndex: 1,
    dropTargetTypes: ['card'],
    childIds: ['held'],
    layout: 'stack',
  } as HolderWidget;
  const widgets = stateOf(
    inHolder,
    card('drag', 500, 500),
    card('low', 100, 100, { zIndex: 1 }),
    card('high', 110, 110, { zIndex: 9 }),
    card('held', 100, 100, { zIndex: 20 }),
    card('piled', 100, 100, { zIndex: 30, inPile: true }),
  ).game.widgets;

  it('finds the topmost loose card under the centre, skipping holders and piles', () => {
    expect(findStackTargetAt(widgets, 'drag', 100, 100, 80, 120)).toBe('high');
    expect(findStackTargetAt(widgets, 'drag', 700, 700, 80, 120)).toBeNull();
  });

  it('only cards stack', () => {
    expect(findStackTargetAt(widgets, 'h', 100, 100, 80, 120)).toBeNull();
  });
});
