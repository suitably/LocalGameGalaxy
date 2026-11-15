/**
 * Draw pot on Cloudflare: Durable Object per pot + worker entry [ID: CF-DRAWPOT-ROUTES]
 *
 * The API and the pot rules are shared with the companion server
 * (`server/src/plugins/drawpot/core/`). Here each pot is one `DrawPotObject`
 * (`idFromName(potId)`), which serialises requests, so draws are atomic. Pots delete themselves
 * after `LIMITS.ttlMs` (alarm).
 */
import type { DrawPotOp } from '../../server/src/plugins/drawpot/core/logic';
import type { DrawPotState } from '../../server/src/plugins/drawpot/core/types';
import {
  handleDrawPotRequest,
  jsonResponse,
  runOp,
  type PotExecutor,
} from '../../server/src/plugins/drawpot/core/http';

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}
export interface DrawPotNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStub;
}
export interface DrawPotEnv {
  DRAW_POTS?: DrawPotNamespace;
}

interface DurableObjectStorageLike {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  deleteAll(): Promise<void>;
  setAlarm(time: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}
interface DurableObjectStateLike {
  storage: DurableObjectStorageLike;
}

const STATE_KEY = 'pot';

/** One pot: runs operations one after another on the stored state. */
export class DrawPotObject {
  private readonly ctx: DurableObjectStateLike;

  constructor(ctx: DurableObjectStateLike, _env?: unknown) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const op = (await request.json()) as DrawPotOp;
    const state = (await this.ctx.storage.get<DrawPotState>(STATE_KEY)) ?? null;
    const result = runOp(state, op);
    if (result.next === null) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
    } else if (result.next) {
      await this.ctx.storage.put(STATE_KEY, result.next);
      if (op.op === 'create') await this.ctx.storage.setAlarm(result.next.expiresAt);
    }
    return jsonResponse(result.status, result.body);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

const durableExecutor =
  (ns: DrawPotNamespace): PotExecutor =>
  async (potId, op) => {
    const res = await ns
      .get(ns.idFromName(potId))
      .fetch(
        new Request('https://drawpot.internal/op', { method: 'POST', body: JSON.stringify(op) }),
      );
    return { status: res.status, body: await res.json() };
  };

export async function handleDrawPot(request: Request, env: DrawPotEnv): Promise<Response> {
  if (request.method === 'OPTIONS')
    return handleDrawPotRequest(request, async () => ({ status: 204, body: null }));
  const ns = env.DRAW_POTS;
  if (!ns)
    return jsonResponse(503, { error: 'unavailable', message: 'draw pot storage not configured' });
  return handleDrawPotRequest(request, durableExecutor(ns));
}
