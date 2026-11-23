/**
 * Web Worker that runs the Workshop Lua scripts of one table [ID: GAME-TABLETOP-LUA-WORKER]
 *
 * Host only (ADR-0005 decision 2). Owns the wasmoon VM and a `LuaSession`; answers every job
 * with `done` so the page can terminate a Worker that hangs. The page creates it only for a
 * game with scripts while the runtime flag is on, so wasmoon is a separate lazy chunk.
 */
import wasmUrl from 'wasmoon/dist/glue.wasm?url';
import { createWasmoonVm } from './wasmoonVm';
import { createLuaSession, type LuaSession } from '../logic/luaSession';
import type { LuaFromWorker, LuaToWorker } from '../logic/luaProtocol';

/** The Worker global, typed without pulling the `webworker` lib into the page build. */
const scope = self as unknown as {
  postMessage(message: LuaFromWorker): void;
  onmessage: ((event: MessageEvent<LuaToWorker>) => void) | null;
};
const post = (message: LuaFromWorker) => scope.postMessage(message);
let session: LuaSession | null = null;
let queue: Promise<void> = Promise.resolve();

async function handle(message: LuaToWorker): Promise<void> {
  if (message.t === 'start') {
    const vm = await createWasmoonVm(wasmUrl);
    session = createLuaSession(
      vm,
      message.game,
      {
        intent: (action) => post({ t: 'intent', action }),
        print: (text, color, to) => post({ t: 'print', text, to, ...(color ? { color } : {}) }),
        unshimmed: (name) => post({ t: 'unshimmed', name }),
      },
      { budget: message.budget, seed: message.seed },
    );
    await session.start();
    return;
  }
  if (!session) return;
  switch (message.t) {
    case 'game':
      session.setGame(message.game);
      break;
    case 'event':
      session.event(message.name, message.args, message.owner);
      break;
    case 'turn':
      session.turn(message.color, message.previous);
      break;
    case 'click':
      session.click(message.buttonId, message.color);
      break;
    case 'tick':
      session.tick(message.dt);
      break;
    case 'save': {
      const { states, meta } = session.save();
      post({ t: 'saved', states, meta: { notes: meta.notes, objects: meta.objects } });
      break;
    }
  }
}

scope.onmessage = (event) => {
  // jobs run strictly in order; `start` is async (wasm load), the rest are synchronous
  queue = queue.then(async () => {
    try {
      await handle(event.data);
      post({ t: 'done' });
    } catch (err) {
      post({ t: 'failed', message: err instanceof Error ? err.message : String(err) });
    }
  });
};
