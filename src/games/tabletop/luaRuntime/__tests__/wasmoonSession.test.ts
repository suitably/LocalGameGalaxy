/**
 * Integration: a hand-written Workshop-style script in real wasmoon (Lua 5.4 WASM) under
 * Vitest (#705). Node loads wasmoon's `glue.wasm` from the package.
 */
import { describe, expect, it } from 'vitest';
import { createWasmoonVm } from '../wasmoonVm';
import { createLuaSession } from '../../logic/luaSession';
import { recorder, scriptedGame } from '../../logic/__tests__/luaRuntimeFixture';
import { tabletopReducer, type TabletopGameState } from '../../logic/tabletopReducer';
import type { TabletopGameDefinition } from '../../logic/types';

const GLOBAL = `
local count = 0
function onLoad(state)
  if state ~= "" then count = JSON.decode(state).count end
  local deck = getObjectFromGUID("deck1")
  deck.shuffle()
  deck.deal(1, "Red")
  local c = deck.takeObject({ position = { x = 2, y = 1, z = 10 } })
  c.setName("taken")
  printToAll("seated " .. table.concat(getSeatedPlayers(), ","))
  Wait.time(function() broadcastToAll("waited") end, 0.15)
  WebRequest.get("http://example.com")
  print(type(io), type(os), type(require), type(load), type(debug), string.dump)
end
function onSave() return JSON.encode({ count = count + 1 }) end
function onObjectDrop(color, obj) obj.setName("dropped by " .. color) end
function onPlayerTurn(p, prev) printToAll("turn " .. p.color .. " " .. (prev and prev.color or "-")) end
function onObjectEnterContainer(c, o) printToAll(o.getGUID() .. " into " .. c.guid .. " " .. c.tag) end
`;

const TOKEN = `
function onLoad()
  self.createButton({ click_function = "go", function_owner = self, label = "Go" })
  self.createButton({ click_function = "spin", function_owner = self, label = "Spin" })
end
function go(obj, color) obj.setName("pressed by " .. color); Global.setVar("x", 1) end
function spin() while true do end end
`;

async function start(game: TabletopGameDefinition) {
  const rec = recorder();
  const vm = await createWasmoonVm();
  const session = createLuaSession(vm, game, rec.out, { budget: 200_000, seed: 7 });
  await session.start();
  let state: TabletopGameState = { game, flyingCards: [] };
  const apply = () => {
    for (const a of rec.intents.splice(0)) state = tabletopReducer(state, a);
    session.setGame(state.game);
    return state.game;
  };
  return { rec, session, apply };
}

describe('Lua runtime on wasmoon', () => {
  const game = scriptedGame({
    global: { lua: GLOBAL, luaState: JSON.stringify({ count: 4 }) },
    objects: { tok1: { lua: TOKEN } },
  });

  it('runs onLoad as reducer intents, sandboxed, with unshimmed calls reported', async () => {
    const { rec, session, apply } = await start(game);
    expect(rec.intents.map((a) => a.type)).toEqual([
      'ADD_WIDGET',
      'ADD_WIDGET',
      'SHUFFLE_DECK',
      'DRAW_CARD',
      'DRAW_CARD',
      'PATCH_WIDGETS',
    ]);
    // the host decided the shuffle order and stamped it into the intent
    const shuffle = rec.intents[2];
    expect(shuffle.type === 'SHUFFLE_DECK' && shuffle.payload.order).toHaveLength(3);
    const g = apply();
    expect(g.widgets.h1.type === 'holder' && g.widgets.h1.childIds).toHaveLength(1);
    expect(Object.values(g.widgets).some((w) => w.label === 'taken')).toBe(true);
    expect(rec.prints.map((p) => p.text)).toContain('seated White,Red');
    expect(rec.prints.map((p) => p.text)).toContain('nil nil nil nil nil nil');
    expect(rec.unshimmed).toContain('WebRequest.get');
    session.tick(0.1);
    expect(rec.prints.map((p) => p.text)).not.toContain('waited');
    session.tick(0.1);
    expect(rec.prints.map((p) => p.text)).toContain('waited');
    expect(session.save().states['-1']).toBe(JSON.stringify({ count: 5 }));
    session.close();
  });

  it('calls click functions and events, and survives a runaway loop', async () => {
    const { rec, session, apply } = await start(game);
    apply();
    expect(session.click('lua_rt_tok1_0', 'Red')).toBe(true);
    expect(rec.intents).toMatchObject([
      { type: 'PATCH_WIDGETS', payload: { patches: { tok1: { label: 'pressed by Red' } } } },
    ]);
    apply();
    expect(session.click('lua_rt_tok1_1', 'White')).toBe(true);
    expect(rec.prints.some((p) => p.to === 'error' && p.text.includes('budget'))).toBe(true);
    session.event('onObjectDrop', ['White', { __obj: 'die1' }]);
    expect(rec.intents.at(-1)).toMatchObject({
      type: 'PATCH_WIDGETS',
      payload: { patches: { die1: { label: 'dropped by White' } } },
    });
    expect(session.click('nope', 'White')).toBe(false);
    session.turn('Red', 'White');
    session.event('onObjectEnterContainer', [{ __obj: 'h1' }, { __obj: 'c1' }]);
    expect(rec.prints.map((p) => p.text)).toEqual(
      expect.arrayContaining(['turn Red White', 'c1 into h1 Hand']),
    );
    session.close();
  });
});
