import type { LuaTarget, LuaTranslateContext } from '../luaTranslator';
import type { GameScripts, WidgetType } from '../types';

// Hand-written Lua snippets only (no Workshop content, Q21).

export const target = (
  id: string,
  type: WidgetType,
  extra: Partial<LuaTarget> = {},
): LuaTarget => ({
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

export const ctx: LuaTranslateContext = {
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
export const onBoard = (clickBody: string, extra = ''): GameScripts => ({
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
