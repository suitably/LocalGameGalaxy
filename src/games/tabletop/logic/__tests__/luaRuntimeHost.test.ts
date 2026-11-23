/** The host page's Lua runtime controller with a fake Worker (#705). */
import { describe, expect, it } from 'vitest';
import { LuaRuntimeHost, type LuaWorkerLike } from '../luaRuntimeHost';
import { LUA_JOB_TIMEOUT_MS, type LuaFromWorker, type LuaToWorker } from '../luaProtocol';
import type { TabletopAction } from '../tabletopReducer';
import type { TabletopGameDefinition } from '../types';
import { scriptedGame } from './luaRuntimeFixture';
import { wid } from './routineFixture';

function setup() {
  const sent: LuaToWorker[] = [];
  const dispatched: TabletopAction[] = [];
  let terminated = false;
  let now = 1000;
  const base = scriptedGame({ global: { lua: 'x' } });
  const button = wid('lua_rt_tok1_0', { type: 'button', text: 'Go', routine: [] });
  let game: TabletopGameDefinition = {
    ...base,
    widgets: { ...base.widgets, [button.id]: button },
    importReport: {
      source: 'tts',
      totals: { objects: 1, converted: 1, degraded: 0, dropped: 0 },
      byType: {},
      scripts: { global: true, objects: 0, xmlUi: false },
      imageHosts: {},
    },
  };
  const worker: LuaWorkerLike = {
    postMessage: (m) => sent.push(m),
    terminate: () => {
      terminated = true;
    },
    onmessage: null,
    onerror: null,
  };
  const host = new LuaRuntimeHost({
    createWorker: () => worker,
    dispatch: (a) => dispatched.push(a),
    getGame: () => game,
    viewerSeat: () => 0,
    now: () => now,
    onChange: () => {},
  });
  const reply = (m: LuaFromWorker) => worker.onmessage?.({ data: m });
  return {
    host,
    sent,
    dispatched,
    reply,
    terminated: () => terminated,
    advance: (ms: number) => (now += ms),
    setGame: (g: TabletopGameDefinition) => (game = g),
    game: () => game,
  };
}

const click: TabletopAction = {
  type: 'RUN_ROUTINE',
  payload: { buttonId: 'lua_rt_tok1_0', now: 1 },
};

describe('LuaRuntimeHost', () => {
  it('starts, forwards clicks with the sender colour and applies only allowed intents', () => {
    const t = setup();
    t.host.start();
    expect(t.sent.map((m) => m.t)).toEqual(['start']);
    t.reply({ t: 'done' });
    expect(t.host.status).toBe('running');
    t.host.observe({ ...click, host: { seed: 1, seat: 1, now: 1 } });
    expect(t.sent.at(-1)).toEqual({ t: 'click', buttonId: 'lua_rt_tok1_0', color: 'Red' });
    t.reply({ t: 'intent', action: { type: 'FLIP_CARD', payload: { cardId: 'c1' } } });
    t.reply({ t: 'intent', action: { type: 'UPDATE_TABLE', payload: { changes: {} } } });
    expect(t.dispatched.map((a) => a.type)).toEqual(['FLIP_CARD']);
    expect(t.host.log.at(-1)).toEqual({ text: 'rejected UPDATE_TABLE', to: 'error' });
  });

  it('kills a Worker whose job hangs and removes its buttons', () => {
    const t = setup();
    t.host.start();
    t.reply({ t: 'done' });
    t.host.observe(click);
    t.advance(LUA_JOB_TIMEOUT_MS + 1);
    t.host.tick();
    expect(t.host.status).toBe('killed');
    expect(t.terminated()).toBe(true);
    expect(t.dispatched).toEqual([{ type: 'DELETE_WIDGETS', payload: { ids: ['lua_rt_tok1_0'] } }]);
  });

  it('holds events while the tab is hidden and sends the newest table first', () => {
    const t = setup();
    t.host.start();
    t.reply({ t: 'done' });
    t.host.setHidden(true);
    t.reply({ t: 'done' }); // the save sent on hiding
    t.host.observe(click);
    expect(t.sent.some((m) => m.t === 'click')).toBe(false);
    t.setGame({ ...t.game(), name: 'changed' });
    t.host.setHidden(false);
    expect(t.sent.slice(-2).map((m) => m.t)).toEqual(['game', 'click']);
  });

  it('writes onSave strings and unshimmed calls into the game, then stops on shutdown', () => {
    const t = setup();
    t.host.start();
    t.reply({ t: 'done' });
    t.reply({ t: 'unshimmed', name: 'WebRequest.get' });
    t.host.shutdown();
    expect(t.sent.at(-1)).toEqual({ t: 'save' });
    t.reply({ t: 'saved', states: { '-1': 'state' }, meta: { notes: '', objects: {} } });
    expect(t.dispatched[0]).toMatchObject({
      type: 'APPLY_EDIT_DELTA',
      payload: {
        widgets: {},
        fields: {
          scripts: { global: { lua: 'x', luaState: 'state' } },
          importReport: { unshimmed: ['WebRequest.get'] },
        },
      },
    });
    expect(t.host.status).toBe('stopped');
    expect(t.terminated()).toBe(true);
  });
});
