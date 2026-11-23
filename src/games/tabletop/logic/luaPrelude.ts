/**
 * The Lua prelude as one chunk [ID: LOGIC-TABLETOP-LUA-PRELUDE]
 *
 * Joins the sandbox/budget part and the API part and fills in the budget and the method lists
 * the host answers, so the Lua side and `luaShim.ts` cannot drift apart.
 */
import { DEFAULT_LUA_BUDGET, LUA_HOOK_STEP, LUA_PRELUDE_CORE } from './luaPreludeCore';
import { LUA_PRELUDE_API } from './luaPreludeApi';
import { LUA_HOST_METHODS } from './luaShim';
import { LUA_PLAYER_METHODS } from './luaShimPlayers';

/** Known TTS libraries without a shim: every call reports instead of failing. */
export const LUA_STUB_LIBS = [
  'WebRequest',
  'UI',
  'Physics',
  'Timer',
  'Lighting',
  'Music',
  'Hands',
  'Grid',
];
/** Known TTS global functions without a shim. */
export const LUA_STUB_FUNCTIONS = [
  'spawnObject',
  'spawnObjectJSON',
  'spawnObjectData',
  'destroyObject',
  'group',
  'addHotkey',
  'addContextMenuItem',
  'getObjectsWithAnyTags',
  'getObjectsWithAllTags',
  'flipTable',
  'clearPixelPaint',
  'clearVectorPaint',
];

const luaString = (s: string) => JSON.stringify(s);

export function buildLuaPrelude(budget: number = DEFAULT_LUA_BUDGET): string {
  return (LUA_PRELUDE_CORE + LUA_PRELUDE_API)
    .replace('__LUA_HOOK_STEP', String(LUA_HOOK_STEP))
    .replace('__LUA_BUDGET', String(Math.max(LUA_HOOK_STEP, Math.floor(budget))))
    .replace('__LUA_HOST_METHODS', luaString(LUA_HOST_METHODS.join(' ')))
    .replace('__LUA_PLAYER_METHODS', luaString(LUA_PLAYER_METHODS.join(' ')))
    .replace('__LUA_STUB_LIBS', luaString(LUA_STUB_LIBS.join(' ')))
    .replace('__LUA_STUB_FUNCTIONS', luaString(LUA_STUB_FUNCTIONS.join(' ')));
}
