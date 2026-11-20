import { describe, it, expect } from 'vitest';
import { translateTtsScripts, type LuaTranslateContext } from '../luaTranslator';
import type { GameScripts } from '../types';
import { ctx, onBoard, target } from './luaFixture';

describe('translateTtsScripts — control flow and positions', () => {
  const placed: LuaTranslateContext = {
    ...ctx,
    targets: { ...ctx.targets, deckUp: target('deck_2', 'deck', { faceUp: true }) },
    project: (x, z) => ({ x: 500 + x * 10, y: 500 + z * 10 }),
  };
  const routine = (scripts: GameScripts) => translateTtsScripts(scripts, placed).buttons[0];

  it('unrolls a layout table: waits dropped, cards drawn to their spot and turned over', () => {
    const button = routine(
      onBoard(
        `  if Done == false then
    Deck.shuffle()
    startLuaCoroutine(self, 'layOut')
  else
    broadcastToAll('Already set up')
  end
  return true`,
        `Done = false
Deck = getObjectFromGUID('deckG')
SPOTS = {
  { position = {1, 1, 2}, flip = true, frames = 30 },
  { position = {x = 3, y = 1, z = -4}, frames = 5 },
}
function layOut()
  for i, spot in pairs(SPOTS) do
    waitFrames(spot['frames'])
    Deck.takeObject(spot)
  end
  Done = true
  return self.editButton({ index = self.getButtons()[1].index, label = 'Done' })
end
function waitFrames(frames)
  while frames > 0 do
    coroutine.yield(0)
    frames = frames - 1
  end
end`,
      ),
    );
    expect(button.untranslated).toBeUndefined();
    expect(button.routine).toEqual([
      { op: 'SHUFFLE', deck: 'deck_1' },
      { op: 'DRAW', deck: 'deck_1', count: 1, at: { x: 510, y: 520 }, faceUp: true },
      { op: 'DRAW', deck: 'deck_1', count: 1, at: { x: 530, y: 460 }, faceUp: false },
    ]);
  });

  it('flip is relative to how the deck lies; a bag is shuffled and emptied to positions', () => {
    const button = routine(
      onBoard(`  getObjectFromGUID('deckUp').takeObject({ position = {0, 0, 0}, flip = true })
  local bag = getObjectFromGUID('bagG')
  bag.shuffle()
  for i = 1, 2 do bag.takeObject({ position = {i, 0, 0}, rotation = {0, 90, 0} }) end`),
    );
    expect(button.routine).toEqual([
      { op: 'DRAW', deck: 'deck_2', count: 1, at: { x: 500, y: 500 }, faceUp: false },
      { op: 'SHUFFLE', deck: 'bagG' },
      { op: 'TAKE_FROM_BAG', bag: 'bagG', count: 1, at: { x: 510, y: 500 } },
      { op: 'TAKE_FROM_BAG', bag: 'bagG', count: 1, at: { x: 520, y: 500 } },
    ]);
  });

  it('reads Global tables from an object script and follows onload, helpers and nil checks', () => {
    const button = translateTtsScripts(
      {
        global: { lua: "IDS = { deck = 'deckG', spare = { 'cardG' } }" },
        objects: {
          board1: {
            lua: `IDS = Global.getTable('IDS')
function onload()
  DeckOBJ = getObjectFromGUID(IDS["deck"])
  if DeckOBJ ~= nil then
    made = makeButton()
  end
end
function makeButton()
  local params = { click_function = 'go', function_owner = self, label = 'Deal' }
  return self.createButton(params)
end
function go()
  if DeckOBJ ~= nil and not (1 + 1 > 2) then DeckOBJ.shuffle() end
  Wait.frames(function() getObjectFromGUID(IDS.spare[1]).setPositionSmooth({2, 1, 2}) end, 10)
end`,
          },
        },
      },
      placed,
    ).buttons[0];
    expect(button).toMatchObject({ text: 'Deal', id: 'lua_btn_board1_1' });
    expect(button.routine).toEqual([
      { op: 'SHUFFLE', deck: 'deck_1' },
      { op: 'MOVE', widget: 'cardG', x: 520, y: 520 },
    ]);
  });

  it('a click that toggles on a script variable stays inert (routines keep no variables)', () => {
    const r = translateTtsScripts(
      onBoard(
        `  if Away == false then Away = true to = {9, 0, 9} else Away = false to = {0, 0, 0} end
  getObjectFromGUID('cardG').setPosition(to)`,
        'Away = false',
      ),
      placed,
    );
    expect(r.buttons[0]).toMatchObject({ routine: [], untranslated: 'click' });
    expect(r.untranslated).toContainEqual({ owner: 'board1', fn: 'click', reason: 'stateful' });
  });

  it('translating one button leaves the script variables as loaded for the next', () => {
    const lua = `Done = false
function onLoad()
  self.createButton({ click_function = 'a', function_owner = self, label = 'A' })
  self.createButton({ click_function = 'b', function_owner = self, label = 'B' })
end
function a() if not Done then getObjectFromGUID('deckG').shuffle() end Done = true end
function b() if not Done then getObjectFromGUID('deckG').deal(1) end end`;
    const r = translateTtsScripts({ objects: { board1: { lua } } }, placed);
    expect(r.buttons.map((b) => b.routine.length)).toEqual([1, 1]);
  });

  it('a loop that would exceed the step limit is not translated', () => {
    const r = translateTtsScripts(
      onBoard('  for i = 1, 60 do getObjectFromGUID("deckG").takeObject() end'),
      placed,
    );
    expect(r.untranslated).toContainEqual({
      owner: 'board1',
      fn: 'click',
      reason: 'too_many_steps',
    });
  });
});
