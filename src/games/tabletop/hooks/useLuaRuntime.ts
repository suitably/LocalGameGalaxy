/**
 * Runs the Workshop Lua scripts of the open game on the host [ID: HOOK-TABLETOP-LUA-RUNTIME]
 *
 * Only on the device that owns the state (host or local play), only for a game with scripts
 * (`hasRunnableScripts`) and only while the experimental flag `STORAGE_KEYS.TABLETOP_LUA_RUNTIME`
 * is on. The Worker (and with it the wasmoon chunk) is created only then. Returns a dispatch
 * that shows every applied action to the runtime first (events, clicks), and the menu state.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import type { TabletopAction } from '../logic/tabletopReducer';
import type { TabletopGameDefinition } from '../logic/types';
import { LuaRuntimeHost, type LuaWorkerLike } from '../logic/luaRuntimeHost';
import { hasRunnableScripts } from '../logic/luaScriptState';
import { LUA_TICK_MS } from '../logic/luaProtocol';

export interface LuaRuntimeMenu {
  /** Whether the flag is on (the runtime runs or starts). */
  on: boolean;
  toggle: () => void;
  host: LuaRuntimeHost;
}

const createWorker = (): LuaWorkerLike =>
  new Worker(new URL('../luaRuntime/luaWorker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as LuaWorkerLike;

/** What the host reads later, from events and ticks: the latest table and viewer seat. */
interface LiveTable {
  game: TabletopGameDefinition;
  seat: number | null;
}

function createRuntimeHost(
  dispatch: Dispatch<TabletopAction>,
  live: LiveTable,
  onChange: () => void,
) {
  let current = live;
  const host = new LuaRuntimeHost({
    createWorker,
    dispatch,
    getGame: () => current.game,
    viewerSeat: () => current.seat,
    now: Date.now,
    onChange,
  });
  return {
    host,
    setLive: (next: LiveTable) => {
      current = next;
    },
  };
}

export function useLuaRuntime(
  game: TabletopGameDefinition,
  dispatch: Dispatch<TabletopAction>,
  owner: boolean,
  viewerSeat: number | null,
): { dispatch: Dispatch<TabletopAction>; lua?: LuaRuntimeMenu } {
  const [on, setOn] = useState(() => storage.get(STORAGE_KEYS.TABLETOP_LUA_RUNTIME) === '1');
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const prevRef = useRef(game);
  const [{ host, setLive }] = useState(() =>
    createRuntimeHost(dispatch, { game, seat: viewerSeat }, refresh),
  );
  useEffect(() => setLive({ game, seat: viewerSeat }));
  const scripted = owner && hasRunnableScripts(game);
  const active = scripted && on;

  useEffect(() => {
    if (!active) return;
    host.start();
    const timer = setInterval(() => host.tick(), LUA_TICK_MS);
    const onVisibility = () => host.setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      host.shutdown();
    };
  }, [active, host]);

  useEffect(() => {
    if (prevRef.current !== game) host.gameChanged(prevRef.current, game);
    prevRef.current = game;
  }, [game, host]);

  const observed = useCallback<Dispatch<TabletopAction>>(
    (action) => {
      host.observe(action);
      dispatch(action);
    },
    [host, dispatch],
  );

  const toggle = useCallback(() => {
    setOn((was) => {
      storage.set(STORAGE_KEYS.TABLETOP_LUA_RUNTIME, was ? '0' : '1');
      return !was;
    });
  }, []);

  return { dispatch: observed, lua: scripted ? { on, toggle, host } : undefined };
}
