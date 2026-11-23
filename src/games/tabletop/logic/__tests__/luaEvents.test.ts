/** TTS events from applied actions and table diffs (#705). */
import { describe, expect, it } from 'vitest';
import { actionEvents, diffEvents, DROP_IDLE_MS, LuaDragTracker, senderColor } from '../luaEvents';
import { tabletopReducer, type TabletopAction, type TabletopGameState } from '../tabletopReducer';
import { scriptedGame } from './luaRuntimeFixture';

const game = scriptedGame();
const apply = (...actions: TabletopAction[]) =>
  actions.reduce<TabletopGameState>((s, a) => tabletopReducer(s, a), { game, flyingCards: [] })
    .game;
const names = (events: { kind: string; name?: string }[]) =>
  events.map((e) => (e.kind === 'event' ? e.name : e.kind));

describe('Lua events', () => {
  it('maps the sender seat to its TTS colour', () => {
    const stamped = (seat: number | null | undefined) =>
      ({
        type: 'FLIP_CARD',
        payload: { cardId: 'c1' },
        host: { seed: 1, seat, now: 1 },
      }) as TabletopAction;
    expect(senderColor(stamped(1), game, 0)).toBe('Red');
    expect(senderColor(stamped(undefined), game, 0)).toBe('White');
    expect(senderColor(stamped(null), game, 0)).toBe('Grey');
  });

  it('turns presses on script buttons into clicks', () => {
    const drags = new LuaDragTracker();
    const press = (buttonId: string) =>
      actionEvents({ type: 'RUN_ROUTINE', payload: { buttonId, now: 1 } }, game, 'Red', drags, 0);
    expect(press('lua_rt_tok1_0')).toEqual([
      { kind: 'click', buttonId: 'lua_rt_tok1_0', color: 'Red' },
    ]);
    expect(press('lua_btn_tok1_1')).toEqual([]);
  });

  it('picks up once per drag and drops after the last move', () => {
    const drags = new LuaDragTracker();
    const move = (now: number) =>
      actionEvents(
        { type: 'MOVE_WIDGET', payload: { id: 'tok1', x: now, y: 0, gesture: 'g1' } },
        game,
        'White',
        drags,
        now,
      );
    expect(names(move(0))).toEqual(['onObjectPickUp', 'onPickUp']);
    expect(move(50)).toEqual([]);
    expect(drags.due(50 + DROP_IDLE_MS - 1)).toEqual([]);
    expect(drags.due(50 + DROP_IDLE_MS)).toMatchObject([
      { name: 'onObjectDrop', args: ['White', { __obj: 'tok1' }] },
      { name: 'onDrop', args: ['White'], owner: 'tok1' },
    ]);
    expect(drags.due(10_000)).toEqual([]);
  });

  it('reads container, zone and turn changes from the diff', () => {
    const next = apply(
      { type: 'DRAW_CARD', payload: { deckId: 'deck1', targetHolderId: 'h1' } },
      { type: 'MOVE_WIDGET', payload: { id: 'die1', x: 400, y: 400 } },
      { type: 'NEXT_TURN', payload: { seat: 1 } },
    );
    const events = diffEvents(game, next);
    expect(events).toEqual(
      expect.arrayContaining([
        {
          kind: 'event',
          name: 'onObjectLeaveContainer',
          args: [{ __obj: 'deck1' }, { __obj: 'c3' }],
        },
        { kind: 'event', name: 'onObjectEnterContainer', args: [{ __obj: 'h1' }, { __obj: 'c3' }] },
        {
          kind: 'event',
          name: 'onObjectEnterScriptingZone',
          args: [{ __obj: 'zone1' }, { __obj: 'die1' }],
        },
        { kind: 'turn', color: 'Red', previous: 'White' },
      ]),
    );
    expect(diffEvents(next, next)).toEqual([]);
  });
});
