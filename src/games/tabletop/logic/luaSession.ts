/**
 * One Lua script session on the host [ID: LOGIC-TABLETOP-LUA-SESSION]
 *
 * Runs inside the Web Worker (`luaRuntime/luaWorker.ts`), VM-agnostic (`LuaVm`). Keeps a mirror
 * of the host's table: every script mutation is prepared like a host action
 * (`prepareHostAction`: seed, random results), applied to the mirror so the script reads its
 * own writes, and handed to `out.intent` for the host to accept (`acceptScriptIntent`) and
 * apply. The host replaces the mirror with its real state before each event (`setGame`).
 */
import type { TabletopAction, TabletopGameState } from './tabletopReducer';
import type { TabletopGameDefinition } from './types';
import type { LuaValue, LuaVm } from './luaVm';
import { tabletopReducer } from './tabletopReducer';
import { prepareHostAction } from './hostActions';
import { newSeed } from './rng';
import { buildLuaPrelude } from './luaPrelude';
import { createLuaShim } from './luaShim';
import {
  LUA_RUNTIME_BUTTON_PREFIX,
  LUA_TRANSLATED_BUTTON_PREFIX,
  type LuaRuntimeMeta,
  type LuaShimHost,
} from './luaShimTypes';
import { initialMeta, scriptSources, scriptStates } from './luaScriptState';

export interface LuaSessionOutput {
  intent(action: TabletopAction): void;
  print(text: string, color: string | undefined, to: string): void;
  unshimmed(name: string): void;
}

export interface LuaSessionOptions {
  budget?: number;
  /** Seed for `math.random` (host-decided). */
  seed?: number;
  /** Most intents one entry (event, click, tick) may emit; the rest are dropped and reported. */
  maxIntents?: number;
}

export const DEFAULT_MAX_INTENTS_PER_ENTRY = 2000;

export interface LuaSession {
  /** Loads every script, then runs `onLoad(script_state)` (objects first, Global last). */
  start(): Promise<void>;
  setGame(game: TabletopGameDefinition): void;
  event(name: string, args: LuaValue[], owner?: string): void;
  turn(color: string, previous?: string): void;
  /** A press on a script button; false if the id is not one of this session's buttons. */
  click(buttonId: string, color: string): boolean;
  tick(dtSeconds: number): void;
  /** `onSave()` results per owner (`-1` = Global) and the runtime meta. */
  save(): { states: Record<string, string>; meta: LuaRuntimeMeta };
  close(): void;
}

/**
 * Before `onLoad`: script buttons of an earlier run go (onLoad creates them again) and the
 * translator's static buttons are hidden, so a button is not there twice.
 */
function replaceStaticButtons(host: LuaShimHost): void {
  const widgets = host.game().widgets;
  const ids = Object.keys(widgets);
  const stale = ids.filter((id) => id.startsWith(LUA_RUNTIME_BUTTON_PREFIX));
  if (stale.length > 0) host.emit({ type: 'DELETE_WIDGETS', payload: { ids: stale } });
  const shown = ids.filter(
    (id) => id.startsWith(LUA_TRANSLATED_BUTTON_PREFIX) && widgets[id].display !== false,
  );
  if (shown.length === 0) return;
  const patches = Object.fromEntries(shown.map((id) => [id, { display: false }]));
  host.emit({ type: 'PATCH_WIDGETS', payload: { patches } });
}

export function createLuaSession(
  vm: LuaVm,
  initial: TabletopGameDefinition,
  out: LuaSessionOutput,
  options: LuaSessionOptions = {},
): LuaSession {
  let mirror: TabletopGameState = { game: initial, flyingCards: [] };
  const maxIntents = options.maxIntents ?? DEFAULT_MAX_INTENTS_PER_ENTRY;
  let intents = 0;
  const host: LuaShimHost = {
    game: () => mirror.game,
    emit(action) {
      const prepared = prepareHostAction(action, mirror.game, null);
      if (intents >= maxIntents) {
        if (intents === maxIntents) out.unshimmed('intent limit per call');
        intents += 1;
        return prepared;
      }
      intents += 1;
      mirror = tabletopReducer(mirror, prepared);
      out.intent(prepared);
      return prepared;
    },
    print: out.print,
    unshimmed: out.unshimmed,
    meta: initialMeta(initial),
  };
  vm.setHostFunction('__host', createLuaShim(host));

  /** Each host entry gets a fresh intent allowance. */
  const enter = <T>(fn: () => T): T => {
    intents = 0;
    return fn();
  };
  const call = (name: string, ...args: LuaValue[]) => enter(() => vm.call(name, ...args));

  return {
    async start() {
      await vm.run(buildLuaPrelude(options.budget));
      enter(() => replaceStaticButtons(host));
      for (const [owner, source] of scriptSources(mirror.game)) call('__rt_load', owner, source);
      call('__rt_start', scriptStates(mirror.game), options.seed ?? newSeed());
    },
    setGame(game) {
      mirror = { ...mirror, game };
    },
    event(name, args, owner) {
      if (owner) call('__rt_event', name, args, owner);
      else call('__rt_event', name, args);
    },
    turn(color, previous) {
      if (previous) call('__rt_turn', color, previous);
      else call('__rt_turn', color);
    },
    click(buttonId, color) {
      const ref = host.meta.buttons[buttonId];
      if (!ref) return false;
      call('__rt_click', ref.owner, ref.fn, ref.target, color);
      return true;
    },
    tick(dtSeconds) {
      call('__rt_tick', dtSeconds);
    },
    save() {
      const raw = call('__rt_save');
      const states: Record<string, string> = {};
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [owner, s] of Object.entries(raw)) if (typeof s === 'string') states[owner] = s;
      }
      return { states, meta: host.meta };
    },
    close() {
      vm.close();
    },
  };
}
