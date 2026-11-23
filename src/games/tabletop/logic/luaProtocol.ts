/**
 * Messages between the host page and the Lua Worker [ID: LOGIC-TABLETOP-LUA-PROTOCOL]
 *
 * The page sends the table (`start`, `game`) and what happened (`event`, `turn`, `click`,
 * `tick`, `save`); the Worker answers with script intents, chat lines, unshimmed calls and saved
 * script state, and ends every job with `done` so the page's watchdog can kill a Worker that
 * hangs (`LUA_JOB_TIMEOUT_MS`).
 */
import type { TabletopAction } from './tabletopReducer';
import type { TabletopGameDefinition } from './types';
import type { LuaValue } from './luaVm';
import type { LuaRuntimeMeta } from './luaShimTypes';

export type LuaToWorker =
  | { t: 'start'; game: TabletopGameDefinition; budget?: number; seed: number }
  | { t: 'game'; game: TabletopGameDefinition }
  | { t: 'event'; name: string; args: LuaValue[]; owner?: string }
  | { t: 'turn'; color: string; previous?: string }
  | { t: 'click'; buttonId: string; color: string }
  | { t: 'tick'; dt: number }
  | { t: 'save' };

export type LuaFromWorker =
  | { t: 'intent'; action: TabletopAction }
  | { t: 'print'; text: string; color?: string; to: string }
  | { t: 'unshimmed'; name: string }
  | { t: 'saved'; states: Record<string, string>; meta: Pick<LuaRuntimeMeta, 'notes' | 'objects'> }
  | { t: 'done' }
  | { t: 'failed'; message: string };

/** A job (one message) that has not answered `done` after this long kills the Worker. */
export const LUA_JOB_TIMEOUT_MS = 3000;
/** Starting loads every script and runs `onLoad`; it gets more time. */
export const LUA_START_TIMEOUT_MS = 15000;
/** Host tick for `Wait.*` and coroutines. */
export const LUA_TICK_MS = 100;
