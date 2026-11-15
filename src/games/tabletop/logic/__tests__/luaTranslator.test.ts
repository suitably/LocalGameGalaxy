import { describe, it, expect } from 'vitest';
import { translateTtsScripts, type LuaTarget, type LuaTranslateContext } from '../luaTranslator';
import { ttsStateNumbers } from '../ttsLuaImport';
import type { GameScripts, WidgetType } from '../types';

// Hand-written Lua snippets only (no Workshop content, Q21).

const target = (id: string, type: WidgetType, extra: Partial<LuaTarget> = {}): LuaTarget => ({
  id,
  type,
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  zIndex: 5,
  scaleX: 1,
  scaleZ: 1,
  ...extra,
});

const ctx: LuaTranslateContext = {
  targets: {
    board1: target('board1', 'token'),
    deckG: target('deck_1', 'deck'),
    bagG: target('bagG', 'bag'),
    cardG: target('cardG', 'card'),
    tileG: target('tileG', 'token', { states: [1, 2, 3] }),
    holdG: target('holdG', 'holder'),
  },
  hands: { Red: 'handRed' },
  scale: 50,
};

/** One object script on `board1` with a button calling `click`. */
const onBoard = (clickBody: string, extra = ''): GameScripts => ({
  objects: {
    board1: {
      lua: `${extra}
function onLoad()
  self.createButton({ click_function = 'click', function_owner = self, label = 'Go',
    position = {0, 0.2, 1}, width = 1000, height = 400 })
end
function click(obj, color)
${clickBody}
end`,
    },
  },
});

const routineOf = (scripts: GameScripts) => {
  const r = translateTtsScripts(scripts, ctx);
  return { button: r.buttons[0], r };
};

describe('translateTtsScripts — idioms (#704)', () => {
  it('shuffle and deal on a deck by GUID variable', () => {
    const { button, r } = routineOf(
      onBoard(
        `  local deck = getObjectFromGUID(DECK)\n  deck.shuffle()\n  deck:deal(5)`,
        "DECK = 'deckG'",
      ),
    );
    expect(button.routine).toEqual([
      { op: 'SHUFFLE', deck: 'deck_1' },
      { op: 'DEAL', deck: 'deck_1', count: 5 },
    ]);
    expect(button.untranslated).toBeUndefined();
    expect(button.text).toBe('Go');
    expect(r.coverage).toEqual({ total: 1, translated: 1 });
    expect(r.untranslated).toEqual([]);
  });

  it('deal to a colour and dealToColor become a draw into that hand', () => {
    const { button } = routineOf(
      onBoard(
        `  getObjectFromGUID('deckG').deal(2, 'Red')\n  getObjectFromGUID('deckG').dealToColor(1, "Red")`,
      ),
    );
    expect(button.routine).toEqual([
      { op: 'DRAW', deck: 'deck_1', count: 2, to: 'handRed' },
      { op: 'DRAW', deck: 'deck_1', count: 1, to: 'handRed' },
    ]);
  });

  it('takeObject from a deck or a bag, putObject, flip, setState, setName', () => {
    const { button } = routineOf(
      onBoard(`  local g = { deck = 'deckG', bag = 'bagG' }
  getObjectFromGUID(g.deck).takeObject({ position = {1, 2, 3}, smooth = false })
  getObjectFromGUID(g['bag']).takeObject()
  getObjectFromGUID('holdG').putObject(getObjectFromGUID('cardG'))
  getObjectFromGUID('cardG').flip()
  getObjectFromGUID('tileG').setState(3)
  self.setName('Round ' .. 2)
  broadcastToAll('Setup done', {1, 1, 1})`),
    );
    expect(button.routine).toEqual([
      { op: 'DRAW', deck: 'deck_1', count: 1 },
      { op: 'TAKE_FROM_BAG', bag: 'bagG', count: 1 },
      { op: 'PLACE_IN_HOLDER', widget: 'cardG', holder: 'holdG' },
      { op: 'FLIP', cards: ['cardG'] },
      { op: 'SET_STATE', widget: 'tileG', state: 2 },
      { op: 'SET', widget: 'board1', props: { label: 'Round 2' } },
    ]);
  });

  it('inlines helpers of the same script and binds the first click parameter to the object', () => {
    const { button } = routineOf(
      onBoard(
        '  setup(5)\n  obj.setName("Started")',
        `function setup(n)
  local d = getObjectFromGUID('deckG')
  d.shuffle()
  d.deal(n)
end`,
      ),
    );
    expect(button.routine).toEqual([
      { op: 'SHUFFLE', deck: 'deck_1' },
      { op: 'DEAL', deck: 'deck_1', count: 5 },
      { op: 'SET', widget: 'board1', props: { label: 'Started' } },
    ]);
  });

  it('places the button on its object from the local position and size', () => {
    const { button } = routineOf(onBoard('  getObjectFromGUID("deckG").shuffle()'));
    // centre (150,150) + z 1 * 50 px; 1000 → 100 px, 400 → 40 px
    expect(button).toMatchObject({ x: 100, y: 180, width: 100, height: 40, zIndex: 6 });
    expect(button.id).toBe('lua_btn_board1_1');
  });
});

describe('translateTtsScripts — untranslated (#704)', () => {
  const cases: [string, string, string?][] = [
    ['branch', '  if color == "Red" then getObjectFromGUID("deckG").shuffle() end', 'if'],
    ['loop', '  for i = 1, 3 do print(i) end', 'fornumeric'],
    ['unknown API', '  Wait.time(function() end, 1)', 'Wait.time'],
    ['caller colour', '  getObjectFromGUID("deckG").deal(1, color)', 'deal'],
    ['shuffle on a bag', '  getObjectFromGUID("bagG").shuffle()', 'shuffle'],
    ['unknown GUID', '  getObjectFromGUID("nope").shuffle()', 'shuffle'],
    ['flip=true take', '  getObjectFromGUID("deckG").takeObject({ flip = true })', 'takeObject'],
    ['used return value', '  local c = getObjectFromGUID("deckG").takeObject()', 'takeObject'],
    ['unknown state', '  getObjectFromGUID("tileG").setState(9)', 'setState'],
  ];
  it.each(cases)('%s → inert button, listed with the reason', (_, body, reason) => {
    const { button, r } = routineOf(onBoard(body));
    expect(button.routine).toEqual([]);
    expect(button.untranslated).toBe('click');
    expect(r.coverage).toEqual({ total: 1, translated: 0 });
    expect(r.untranslated).toContainEqual({ owner: 'board1', fn: 'click', reason });
  });

  it('a script that does not parse is listed as a whole', () => {
    const r = translateTtsScripts({ objects: { board1: { lua: 'function (' } } }, ctx);
    expect(r.untranslated).toEqual([{ owner: 'board1', fn: '*', reason: 'parse_error' }]);
    expect(r.coverage.total).toBe(0);
  });

  it('createButton in a loop counts as a dynamic, inert button', () => {
    const r = translateTtsScripts(
      {
        objects: {
          board1: {
            lua: `function onLoad()
  for i = 1, 2 do self.createButton({ click_function = 'pick', label = 'Pick' }) end
end
function pick() end`,
          },
        },
      },
      ctx,
    );
    expect(r.coverage).toEqual({ total: 1, translated: 0 });
    expect(r.buttons[0]).toMatchObject({ text: 'Pick', untranslated: 'pick', routine: [] });
    expect(r.untranslated).toContainEqual({ owner: 'board1', fn: 'pick', reason: 'dynamic' });
    expect(r.untranslated).toContainEqual({ owner: 'board1', fn: 'onLoad', reason: 'event' });
  });

  it('a Global click function (default function_owner) on an object from Global', () => {
    const r = translateTtsScripts(
      {
        global: {
          lua: `function onLoad()
  getObjectFromGUID('board1').createButton({ click_function = 'go', label = 'Deal' })
end
function go() getObjectFromGUID('deckG').deal(3) end
function onObjectDrop() end`,
        },
        objects: {},
      },
      ctx,
    );
    expect(r.buttons[0].routine).toEqual([{ op: 'DEAL', deck: 'deck_1', count: 3 }]);
    expect(r.untranslated).toEqual([{ owner: 'global', fn: 'onObjectDrop', reason: 'event' }]);
  });

  it('a button on an object that is not on the table is counted but not placed', () => {
    const r = translateTtsScripts(
      { objects: { gone: { lua: onBoard('').objects.board1.lua } } },
      ctx,
    );
    expect(r.buttons).toEqual([]);
    expect(r.coverage).toEqual({ total: 1, translated: 0 });
    expect(r.untranslated).toContainEqual({ owner: 'gone', fn: 'click', reason: 'no_owner' });
  });
});

describe('ttsStateNumbers', () => {
  it('puts the current (missing) state first', () => {
    expect(ttsStateNumbers({ '2': {}, '3': {} })).toEqual([1, 2, 3]);
    expect(ttsStateNumbers({ '1': {}, '3': {} })).toEqual([2, 1, 3]);
  });
});
