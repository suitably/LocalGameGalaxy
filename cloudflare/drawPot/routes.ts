/**
 * Draw pot HTTP API and Durable Object [ID: CF-DRAWPOT-ROUTES]
 *
 * - POST   /api/drawpot                 create → `{ id, adminKey, expiresAt }`
 * - GET    /api/drawpot/:id?participant= public view (+ this participant's draws)
 * - POST   /api/drawpot/:id/draw         `{ participantId, identityId? }` → `{ draw, pot }`
 * - GET    /api/drawpot/:id/admin        host view (header `X-Admin-Key`)
 * - POST   /api/drawpot/:id/admin        `{ action: 'reset' | 'close' | 'reopen' }` (host)
 * - DELETE /api/drawpot/:id              delete the pot (host)
 *
 * Each pot is one `DrawPotObject` (`idFromName(potId)`), which serialises requests, so draws are
 * atomic. Only the SHA-256 of the admin key is stored. Pots delete themselves after
 * `LIMITS.ttlMs` (alarm). CORS is open: the Android app and dev servers call the hosted API.
 */
import {
  applyOp,
  createState,
  cryptoRandomInt,
  isParticipantId,
  validateCreateInput,
  type DrawPotOp,
} from './logic';
import type { DrawPotAdminAction, DrawPotState } from './types';

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  'Access-Control-Max-Age': '86400',
};
const MAX_BODY = 64 * 1024;
const STATE_KEY = 'pot';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomToken(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ID_ALPHABET[cryptoRandomInt(ID_ALPHABET.length)];
  return out;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** One pot: runs operations one after another on the stored state. */
export class DrawPotObject {
  private readonly ctx: DurableObjectStateLike;

  constructor(ctx: DurableObjectStateLike, _env?: unknown) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const op = (await request.json()) as DrawPotOp;
    const state = (await this.ctx.storage.get<DrawPotState>(STATE_KEY)) ?? null;
    const result = applyOp(state, op, Date.now(), cryptoRandomInt);
    if (result.next === null) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
    } else if (result.next) {
      await this.ctx.storage.put(STATE_KEY, result.next);
      if (op.op === 'create') await this.ctx.storage.setAlarm(result.next.expiresAt);
    }
    return json(result.status, result.body);
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('too large');
  return text ? JSON.parse(text) : {};
}

const callPot = (ns: DrawPotNamespace, potId: string, op: DrawPotOp) =>
  ns
    .get(ns.idFromName(potId))
    .fetch(
      new Request('https://drawpot.internal/op', { method: 'POST', body: JSON.stringify(op) }),
    );

async function create(ns: DrawPotNamespace, request: Request): Promise<Response> {
  const input = validateCreateInput(await readBody(request));
  if (typeof input === 'string') return json(400, { error: 'invalid', message: input });
  const adminKey = randomToken(24);
  const hash = await sha256(adminKey);
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = randomToken(10);
    const state = createState(id, input, hash, Date.now(), cryptoRandomInt);
    const res = await callPot(ns, id, { op: 'create', state });
    if (res.status === 201) return json(201, { id, adminKey, expiresAt: state.expiresAt });
  }
  return json(503, { error: 'unavailable' });
}

const ADMIN_ACTIONS: DrawPotAdminAction[] = ['reset', 'close', 'reopen'];

export async function handleDrawPot(request: Request, env: DrawPotEnv): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const ns = env.DRAW_POTS;
  if (!ns) return json(503, { error: 'unavailable', message: 'draw pot storage not configured' });
  const url = new URL(request.url);
  const parts = url.pathname
    .replace(/^\/api\/drawpot\/?/, '')
    .split('/')
    .filter(Boolean);
  try {
    if (parts.length === 0)
      return request.method === 'POST'
        ? await create(ns, request)
        : json(405, { error: 'invalid' });
    const [potId, sub] = parts;
    if (!/^[A-Za-z0-9]{6,16}$/.test(potId) || parts.length > 2)
      return json(404, { error: 'not_found' });
    const adminHash = async () => sha256(request.headers.get('X-Admin-Key') || '');
    if (!sub && request.method === 'GET') {
      const participant = url.searchParams.get('participant') || undefined;
      return await callPot(ns, potId, {
        op: 'view',
        participantId: isParticipantId(participant) ? participant : undefined,
      });
    }
    if (!sub && request.method === 'DELETE')
      return await callPot(ns, potId, { op: 'delete', adminKeyHash: await adminHash() });
    if (sub === 'draw' && request.method === 'POST') {
      const body = (await readBody(request)) as { participantId?: unknown; identityId?: unknown };
      if (!isParticipantId(body.participantId))
        return json(400, { error: 'invalid', message: 'participantId' });
      const identityId =
        typeof body.identityId === 'string' ? body.identityId.slice(0, 8) : undefined;
      return await callPot(ns, potId, {
        op: 'draw',
        participantId: body.participantId,
        identityId,
      });
    }
    if (sub === 'admin' && request.method === 'GET')
      return await callPot(ns, potId, { op: 'admin-view', adminKeyHash: await adminHash() });
    if (sub === 'admin' && request.method === 'POST') {
      const { action } = (await readBody(request)) as { action?: DrawPotAdminAction };
      if (!action || !ADMIN_ACTIONS.includes(action))
        return json(400, { error: 'invalid', message: 'action' });
      return await callPot(ns, potId, {
        op: 'admin-action',
        adminKeyHash: await adminHash(),
        action,
      });
    }
    return json(404, { error: 'not_found' });
  } catch {
    return json(400, { error: 'invalid' });
  }
}
