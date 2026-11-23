/**
 * Types shared by the Lua shim modules [ID: LOGIC-TABLETOP-LUA-SHIM-TYPES]
 */
import type { TabletopAction } from './tabletopReducer';
import type { TabletopGameDefinition, TabletopWidget } from './types';
import type { LuaProjection } from './luaProjection';

/** A button a script created (`createButton`); the click calls `fn` in `owner`'s script. */
export interface LuaButtonRef {
  /** Object (TTS GUID) the button sits on. */
  target: string;
  /** Script that holds the click function (`function_owner`, TTS default Global = `-1`). */
  owner: string;
  fn: string;
  index: number;
}

/** Runtime-only data the shim keeps next to the table; persisted by `luaScriptState.ts`. */
export interface LuaRuntimeMeta {
  notes: string;
  /** Description / GM notes per GUID (the widgets have no such field). */
  objects: Record<string, { description?: string; gmNotes?: string }>;
  /** Widget id of each script-created button. */
  buttons: Record<string, LuaButtonRef>;
}

/** What the shim needs from the session that runs it. */
export interface LuaShimHost {
  /** The table as the script sees it (the worker's mirror, updated by every `emit`). */
  game(): TabletopGameDefinition;
  /**
   * Applies one reducer action as the script's intent and returns it as prepared by the host
   * (random results filled in, `hostActions.ts`).
   */
  emit(action: TabletopAction): TabletopAction;
  print(text: string, color: string | undefined, to: string): void;
  unshimmed(name: string): void;
  meta: LuaRuntimeMeta;
}

/** One object call's context. */
export interface LuaObjectCall {
  host: LuaShimHost;
  guid: string;
  widget: TabletopWidget;
  projection: LuaProjection;
}

/** Marker the Lua side turns into an object proxy (`wrap` in `luaPreludeApi.ts`). */
export const objectRef = (guid: string) => ({ __obj: guid });

/** Widget id prefix of buttons created by scripts at run time. */
export const LUA_RUNTIME_BUTTON_PREFIX = 'lua_rt_';
/** Widget id prefix of buttons the static translator made at import (`luaTranslator.ts`). */
export const LUA_TRANSLATED_BUTTON_PREFIX = 'lua_btn_';
