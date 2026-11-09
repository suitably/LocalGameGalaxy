import { describe, it, expect } from 'vitest';
import type { TabletopAction } from '../tabletopReducer';
import type { HiddenZone, TabletopGameDefinition, TabletopWidget } from '../types';
import { authorizeSeatIntent, isHostOnlyAction, type IntentSender } from '../intentAuthorization';
import { acceptIntent } from '../syncProtocol';

const w = (id: string, extra: Record<string, unknown>) =>
  ({ id, x: 0, y: 0, width: 1, height: 1, zIndex: 1, ...extra }) as unknown as TabletopWidget;
const hand = (id: string, seat: number, childIds: string[]) =>
  w(id, { type: 'holder', isHand: true, ownerSeat: seat, childIds });
const zone = (id: string, ownerSeat?: number): HiddenZone => ({
  id,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  ownerSeat,
});

const game: Pick<TabletopGameDefinition, 'widgets' | 'hiddenZones'> = {
  widgets: {
    deck: w('deck', { type: 'deck', cardIds: ['d1'] }),
    d1: w('d1', { type: 'card' }),
    mine: w('mine', { type: 'card' }),
    theirs: w('theirs', { type: 'card' }),
    table: w('table', { type: 'card' }),
    h0: hand('h0', 0, ['mine']),
    h1: hand('h1', 1, ['theirs']),
    discard: w('discard', { type: 'holder', dropTarget: true, childIds: [] }),
  },
  hiddenZones: { z0: zone('z0', 0), z1: zone('z1', 1), gm: zone('gm') },
};
const seat0: IntentSender = { spectator: false, seat: 0 };
const ok = (action: TabletopAction, sender = seat0) =>
  authorizeSeatIntent(action, sender, game) && acceptIntent(action, sender, game);

describe('intentAuthorization (#685)', () => {
  it('a phone cannot delete widgets or use any other editor action', () => {
    const editor: TabletopAction[] = [
      { type: 'DELETE_WIDGETS', payload: { ids: ['table'] } },
      { type: 'PATCH_WIDGETS', payload: { patches: { h1: { ownerSeat: 0 } } } },
      { type: 'ADD_WIDGET', payload: { widget: w('x', { type: 'card' }) } },
      { type: 'ADD_WIDGETS', payload: { widgets: [w('x', { type: 'card' })] } },
      { type: 'UPDATE_TABLE', payload: { changes: { width: 1 } } },
      { type: 'APPLY_EDIT_DELTA', payload: { widgets: { h1: null } } },
      { type: 'SELECT_SEAT', payload: { seatId: 's' } },
    ];
    for (const action of editor) {
      expect(isHostOnlyAction(action)).toBe(true);
      expect(ok(action)).toBe(false);
    }
  });

  it('a phone cannot take over a hand: no ownerSeat patch, no draw or play from another hand', () => {
    expect(ok({ type: 'PATCH_WIDGETS', payload: { patches: { h1: { ownerSeat: 0 } } } })).toBe(
      false,
    );
    expect(ok({ type: 'DRAW_CARD', payload: { deckId: 'deck', targetHolderId: 'h1' } })).toBe(
      false,
    );
    expect(
      ok({ type: 'PLAY_CARD_FROM_HAND', payload: { cardId: 'theirs', position: { x: 1, y: 1 } } }),
    ).toBe(false);
    for (const action of [
      { type: 'MOVE_WIDGET', payload: { id: 'theirs', x: 1, y: 1 } },
      { type: 'MOVE_WIDGET', payload: { id: 'h1', x: 1, y: 1 } },
      { type: 'FLIP_CARD', payload: { cardId: 'theirs' } },
      { type: 'SNAP_TO_HOLDER', payload: { widgetId: 'theirs', holderId: 'discard' } },
      { type: 'SNAP_TO_HOLDER', payload: { widgetId: 'table', holderId: 'h1' } },
      { type: 'RETURN_CARD_TO_DECK', payload: { cardId: 'theirs', deckId: 'deck' } },
      { type: 'SHUFFLE_DECK', payload: { deckId: 'deck', newCardIds: ['theirs'] } },
      { type: 'ANIMATE_CARD_TO_TABLE', payload: { cardId: 'theirs', targetHolderId: 'discard' } },
    ] as TabletopAction[]) {
      expect(authorizeSeatIntent(action, seat0, game)).toBe(false);
    }
  });

  it('a draw without target lands in the first hand, so it is only allowed when that is the own', () => {
    const draw: TabletopAction = { type: 'DRAW_CARD', payload: { deckId: 'deck' } };
    expect(ok(draw)).toBe(true); // h0 comes first
    expect(ok(draw, { spectator: false, seat: 1 })).toBe(false);
    const toTable: TabletopAction = {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck', position: { x: 1, y: 1 } },
    };
    expect(ok(toTable, { spectator: false, seat: 1 })).toBe(true);
  });

  it('a phone keeps playing within its own seat', () => {
    const allowed: TabletopAction[] = [
      { type: 'DRAW_CARD', payload: { deckId: 'deck', targetHolderId: 'h0' } },
      { type: 'PLAY_CARD_FROM_HAND', payload: { cardId: 'mine', position: { x: 1, y: 1 } } },
      { type: 'MOVE_WIDGET', payload: { id: 'table', x: 1, y: 1 } },
      { type: 'SNAP_TO_HOLDER', payload: { widgetId: 'mine', holderId: 'discard' } },
      { type: 'FLIP_CARD', payload: { cardId: 'mine' } },
      { type: 'ROLL_DIE', payload: { dieId: 'die' } },
      { type: 'UPDATE_COUNTER', payload: { counterId: 'c', delta: 1 } },
    ];
    for (const action of allowed) expect(ok(action)).toBe(true);
    expect(
      authorizeSeatIntent(
        { type: 'ANIMATE_CARD_TO_TABLE', payload: { cardId: 'mine', targetHolderId: 'discard' } },
        seat0,
        game,
      ),
    ).toBe(true);
  });

  it('a phone changes only its own hidden zones and never their owner', () => {
    expect(ok({ type: 'ADD_HIDDEN_ZONE', payload: { zone: zone('n', 0) } })).toBe(true);
    expect(ok({ type: 'ADD_HIDDEN_ZONE', payload: { zone: zone('n', 1) } })).toBe(false);
    expect(ok({ type: 'ADD_HIDDEN_ZONE', payload: { zone: zone('n') } })).toBe(false);
    expect(ok({ type: 'TOGGLE_ZONE_REVEAL', payload: { id: 'z0' } })).toBe(true);
    expect(ok({ type: 'TOGGLE_ZONE_REVEAL', payload: { id: 'z1' } })).toBe(false);
    expect(ok({ type: 'REMOVE_HIDDEN_ZONE', payload: { id: 'gm' } })).toBe(false);
    expect(ok({ type: 'MOVE_HIDDEN_ZONE', payload: { id: 'z0', dx: 1, dy: 1 } })).toBe(true);
    expect(
      ok({ type: 'UPDATE_HIDDEN_ZONE', payload: { id: 'z0', changes: { ownerSeat: 1 } } }),
    ).toBe(false);
    expect(ok({ type: 'UPDATE_HIDDEN_ZONE', payload: { id: 'z0', changes: { label: 'x' } } })).toBe(
      true,
    );
  });

  it('a device without a seat owns no hand and no zone; spectators change nothing', () => {
    const seatless = { spectator: false, seat: null };
    expect(
      ok({ type: 'DRAW_CARD', payload: { deckId: 'deck', targetHolderId: 'h0' } }, seatless),
    ).toBe(false);
    expect(ok({ type: 'TOGGLE_ZONE_REVEAL', payload: { id: 'z0' } }, seatless)).toBe(false);
    expect(ok({ type: 'MOVE_WIDGET', payload: { id: 'table', x: 1, y: 1 } }, seatless)).toBe(true);
    expect(
      authorizeSeatIntent(
        { type: 'ROLL_DIE', payload: { dieId: 'd' } },
        { spectator: true, seat: 0 },
        game,
      ),
    ).toBe(false);
  });

  it("routines (#694): a phone presses table buttons and its own, not another seat's", () => {
    const withButtons = {
      ...game,
      widgets: {
        ...game.widgets,
        deal: w('deal', { type: 'button', routine: [] }),
        b1: w('b1', { type: 'button', routine: [], ownerSeat: 1 }),
        st: w('st', { type: 'token', states: [{}, {}] }),
      },
    };
    const run = (buttonId: string): TabletopAction => ({
      type: 'RUN_ROUTINE',
      payload: { buttonId, now: 0 },
    });
    expect(authorizeSeatIntent(run('deal'), seat0, withButtons)).toBe(true);
    expect(authorizeSeatIntent(run('b1'), seat0, withButtons)).toBe(false);
    expect(authorizeSeatIntent(run('b1'), { spectator: false, seat: 1 }, withButtons)).toBe(true);
    expect(
      authorizeSeatIntent(
        { type: 'SET_STATE', payload: { widgetId: 'st', index: 1 } },
        seat0,
        withButtons,
      ),
    ).toBe(true);
  });

  it('turns (#694): a phone only passes its own turn on', () => {
    const seats = (turn: number) => ({
      ...game,
      widgets: {
        ...game.widgets,
        s0: w('s0', { type: 'seat', index: 0, color: '', turn: turn === 0 }),
        s1: w('s1', { type: 'seat', index: 1, color: '', turn: turn === 1 }),
      },
    });
    const next: TabletopAction = { type: 'NEXT_TURN', payload: {} };
    expect(authorizeSeatIntent(next, seat0, seats(0))).toBe(true);
    expect(authorizeSeatIntent(next, seat0, seats(1))).toBe(false);
    expect(authorizeSeatIntent({ type: 'NEXT_TURN', payload: { seat: 0 } }, seat0, seats(1))).toBe(
      false,
    );
    expect(authorizeSeatIntent(next, { spectator: false, seat: null }, seats(0))).toBe(false);
  });
});
