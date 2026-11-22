/**
 * Thin Lua VM interface for the host-only script runtime [ID: LOGIC-TABLETOP-LUA-VM]
 *
 * ADR-0005 decision 2 / TTS plan D8: the runtime talks to the Lua VM only through this
 * interface, so `wasmoon` (Lua 5.4 in WASM, `luaRuntime/wasmoonVm.ts`) can be swapped for
 * fengari without touching the shim. Only plain data crosses the boundary (`LuaValue`); Lua
 * functions never leave the VM: callbacks are kept in Lua tables and named by string or id.
 */

/** Plain data that crosses the VM boundary (Lua tables ↔ arrays / objects). */
export type LuaValue = boolean | number | string | LuaValue[] | { [key: string]: LuaValue };

/** A host function the Lua side calls; `undefined` arrives in Lua as `nil`. */
export type LuaHostFunction = (...args: unknown[]) => LuaValue | undefined;

export interface LuaVm {
  /** Sets a global host function (only the prelude sees it; it hides it from scripts). */
  setHostFunction(name: string, fn: LuaHostFunction): void;
  /** Runs trusted Lua (the prelude). Errors reject. */
  run(source: string): Promise<void>;
  /** Calls a global Lua function synchronously; Lua errors throw. */
  call(name: string, ...args: LuaValue[]): LuaValue | undefined;
  close(): void;
}

export type LuaVmFactory = () => Promise<LuaVm>;

/** Deepest table nesting copied across the boundary; deeper parts are dropped. */
export const MAX_LUA_VALUE_DEPTH = 16;

/**
 * A JS value as plain Lua data: `null`, `undefined`, functions and non-finite numbers are dropped
 * (wasmoon cannot push `null` inside tables), cycles and deep nesting are cut.
 */
export function toLuaValue(value: unknown, depth = 0): LuaValue | undefined {
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (value === null || typeof value !== 'object' || depth >= MAX_LUA_VALUE_DEPTH) return undefined;
  if (Array.isArray(value)) {
    const out: LuaValue[] = [];
    for (const item of value) {
      const v = toLuaValue(item, depth + 1);
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  const out: Record<string, LuaValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const v = toLuaValue(item, depth + 1);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

/** A Lua table that arrived as a JS object (wasmoon) or array; anything else is `{}`. */
export function asLuaTable(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** Number argument or fallback. */
export const luaNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** String argument or fallback. */
export const luaString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
