/**
 * `LuaVm` on wasmoon (Lua 5.4 in WebAssembly) [ID: GAME-TABLETOP-LUA-WASMOON]
 *
 * The only file that imports `wasmoon` (TTS plan D8); fengari would get a sibling adapter with
 * the same `LuaVm` shape. Only the Worker loads it, so the VM and its `.wasm` stay out of the
 * page bundle until a scripted game is opened with the runtime flag on.
 */
import { LuaFactory } from 'wasmoon';
import type { LuaHostFunction, LuaValue, LuaVm } from '../logic/luaVm';

/** Lua heap limit per VM. */
export const LUA_MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;

interface MemoryLimited {
  setMemoryMax?: (bytes: number | undefined) => void;
}

/** `wasmUrl`: where the browser fetches `glue.wasm`; Node finds it next to the package. */
export async function createWasmoonVm(wasmUrl?: string): Promise<LuaVm> {
  const factory = new LuaFactory(wasmUrl);
  const engine = await factory.createEngine({
    openStandardLibs: true,
    injectObjects: false,
    enableProxy: false,
    traceAllocations: true,
  });
  (engine.global as MemoryLimited).setMemoryMax?.(LUA_MEMORY_LIMIT_BYTES);
  return {
    setHostFunction(name: string, fn: LuaHostFunction) {
      engine.global.set(name, (...args: unknown[]) => fn(...args));
    },
    async run(source: string) {
      await engine.doString(source);
    },
    call(name: string, ...args: LuaValue[]) {
      const fn: unknown = engine.global.get(name);
      if (typeof fn !== 'function') throw new Error(`Lua function ${name} missing`);
      return (fn as (...a: LuaValue[]) => LuaValue | undefined)(...args);
    },
    close() {
      engine.global.close();
    },
  };
}
