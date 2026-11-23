/**
 * Script sources, `LuaScriptState` and runtime meta in the game's sidecar [ID: LOGIC-TABLETOP-LUA-STATE]
 *
 * TTS keeps each script's `onSave()` string as `LuaScriptState` and hands it to `onLoad` on the
 * next load. The runtime does the same with `scripts.global.luaState` / `scripts.objects[guid]
 * .luaState`, so the strings live in the game and therefore in every table save and autosave.
 * Description, GM notes and the notes panel are kept next to them.
 */
import type { GameScripts, ScriptEntry, TabletopGameDefinition } from './types';
import type { LuaRuntimeMeta } from './luaShimTypes';
import { MAX_LUA_SOURCE } from './luaValues';

/** Owner key of the Global script (TTS `Global.guid`). */
export const LUA_GLOBAL_OWNER = '-1';

const runnable = (e: ScriptEntry | undefined) =>
  typeof e?.lua === 'string' && e.lua.trim().length > 0 && e.lua.length <= MAX_LUA_SOURCE;

/**
 * Scripts to load: Global, then each object script whose object is on the table (TTS runs a
 * script only while its object exists; contained objects wake up when spawned).
 */
export function scriptSources(game: TabletopGameDefinition): [string, string][] {
  const out: [string, string][] = [];
  const scripts = game.scripts;
  if (!scripts) return out;
  if (runnable(scripts.global)) out.push([LUA_GLOBAL_OWNER, scripts.global!.lua!]);
  for (const [guid, entry] of Object.entries(scripts.objects)) {
    if (runnable(entry) && game.widgets[guid]) out.push([guid, entry.lua!]);
  }
  return out;
}

/** Whether the runtime has anything to run for this game. */
export const hasRunnableScripts = (game: TabletopGameDefinition): boolean =>
  scriptSources(game).length > 0;

/** `script_state` per owner for `onLoad`. */
export function scriptStates(game: TabletopGameDefinition): Record<string, string> {
  const out: Record<string, string> = {};
  const scripts = game.scripts;
  if (scripts?.global?.luaState) out[LUA_GLOBAL_OWNER] = scripts.global.luaState;
  for (const [guid, e] of Object.entries(scripts?.objects ?? {})) {
    if (e.luaState) out[guid] = e.luaState;
  }
  return out;
}

export function initialMeta(game: TabletopGameDefinition): LuaRuntimeMeta {
  return { notes: game.scripts?.notes ?? '', objects: {}, buttons: {} };
}

/** Longest `onSave` string kept per script (TTS has none; a save file should stay small). */
export const MAX_LUA_STATE = 256 * 1024;

const withEntry = (entry: ScriptEntry | undefined, changes: Partial<ScriptEntry>): ScriptEntry => {
  const next: ScriptEntry = { ...entry };
  for (const [key, value] of Object.entries(changes) as [keyof ScriptEntry, string][]) {
    if (value === undefined) continue;
    if (value === '') delete next[key];
    else (next as Record<string, unknown>)[key] = value;
  }
  return next;
};

/**
 * The sidecar with the session's `onSave` strings and meta written in, or the same object when
 * nothing changed (so no delta and no autosave is caused by an idle save).
 */
export function applyLuaSave(
  scripts: GameScripts,
  saved: { states: Record<string, string>; meta: Pick<LuaRuntimeMeta, 'notes' | 'objects'> },
): GameScripts {
  const changes = new Map<string, Partial<ScriptEntry>>();
  const add = (owner: string, c: Partial<ScriptEntry>) =>
    changes.set(owner, { ...changes.get(owner), ...c });
  for (const [owner, state] of Object.entries(saved.states)) {
    if (state.length <= MAX_LUA_STATE) add(owner, { luaState: state });
  }
  for (const [guid, m] of Object.entries(saved.meta.objects)) {
    add(guid, { description: m.description, gmNotes: m.gmNotes });
  }
  let next = scripts;
  const entryOf = (owner: string) =>
    owner === LUA_GLOBAL_OWNER ? next.global : next.objects[owner];
  for (const [owner, c] of changes) {
    const before = entryOf(owner);
    const after = withEntry(before, c);
    if (JSON.stringify(after) === JSON.stringify(before ?? {})) continue;
    next =
      owner === LUA_GLOBAL_OWNER
        ? { ...next, global: after }
        : { ...next, objects: { ...next.objects, [owner]: after } };
  }
  const notes = saved.meta.notes || undefined;
  if (notes !== next.notes) {
    next = { ...next };
    if (notes) next.notes = notes;
    else delete next.notes;
  }
  return next;
}
