/**
 * Draw pot HTTP API, shared by the Cloudflare worker and the companion server
 * [ID: DRAWPOT-CORE-HTTP]
 *
 * - POST   /api/drawpot                 create → `{ id, adminKey, expiresAt }`
 * - GET    /api/drawpot/:id?participant= public view (+ this participant's draws)
 * - POST   /api/drawpot/:id/draw         `{ participantId, identityId? }` → `{ draw, pot }`
 * - GET    /api/drawpot/:id/admin        host view (header `X-Admin-Key`)
 * - POST   /api/drawpot/:id/admin        `{ action: 'reset' | 'close' | 'reopen' }` (host)
 * - DELETE /api/drawpot/:id              delete the pot (host)
 *
 * The backend supplies a `PotExecutor` that runs one operation on one pot at a time (Durable
 * Object, or a per-pot lock around a file), so draws are atomic. Only the SHA-256 of the admin
 * key is stored. CORS is open: participants open the link on any device.
 */
import {
  applyOp,
  createState,
  cryptoRandomInt,
  isParticipantId,
  validateCreateInput,
  type DrawPotOp,
  type OpResult,
} from './logic';
import type { DrawPotAdminAction, DrawPotState } from './types';

/** Runs one operation on one pot, serialised per pot. */
export type PotExecutor = (
  potId: string,
  op: DrawPotOp,
) => Promise<Pick<OpResult, 'status' | 'body'>>;

export const DRAWPOT_CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
  'Access-Control-Max-Age': '86400',
};
const MAX_BODY = 64 * 1024;

export const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...DRAWPOT_CORS },
  });

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomToken(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ID_ALPHABET[cryptoRandomInt(ID_ALPHABET.length)];
  return out;
}

export const isPotId = (v: string): boolean => /^[A-Za-z0-9]{6,16}$/.test(v);

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Applies one operation to a stored state; the backend persists `next` (null = delete). */
export const runOp = (state: DrawPotState | null, op: DrawPotOp): OpResult =>
  applyOp(state, op, Date.now(), cryptoRandomInt);

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('too large');
  return text ? JSON.parse(text) : {};
}

async function call(exec: PotExecutor, potId: string, op: DrawPotOp): Promise<Response> {
  const { status, body } = await exec(potId, op);
  return jsonResponse(status, body);
}

async function create(exec: PotExecutor, request: Request): Promise<Response> {
  const input = validateCreateInput(await readBody(request));
  if (typeof input === 'string') return jsonResponse(400, { error: 'invalid', message: input });
  const adminKey = randomToken(24);
  const hash = await sha256(adminKey);
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = randomToken(10);
    const state = createState(id, input, hash, Date.now(), cryptoRandomInt);
    const res = await exec(id, { op: 'create', state });
    if (res.status === 201) return jsonResponse(201, { id, adminKey, expiresAt: state.expiresAt });
  }
  return jsonResponse(503, { error: 'unavailable' });
}

const ADMIN_ACTIONS: DrawPotAdminAction[] = ['reset', 'close', 'reopen'];

export async function handleDrawPotRequest(request: Request, exec: PotExecutor): Promise<Response> {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: DRAWPOT_CORS });
  const url = new URL(request.url);
  const parts = url.pathname
    .replace(/^\/api\/drawpot\/?/, '')
    .split('/')
    .filter(Boolean);
  try {
    if (parts.length === 0)
      return request.method === 'POST'
        ? await create(exec, request)
        : jsonResponse(405, { error: 'invalid' });
    const [potId, sub] = parts;
    if (!isPotId(potId) || parts.length > 2) return jsonResponse(404, { error: 'not_found' });
    const adminHash = async () => sha256(request.headers.get('X-Admin-Key') || '');
    if (!sub && request.method === 'GET') {
      const participant = url.searchParams.get('participant') || undefined;
      return await call(exec, potId, {
        op: 'view',
        participantId: isParticipantId(participant) ? participant : undefined,
      });
    }
    if (!sub && request.method === 'DELETE')
      return await call(exec, potId, { op: 'delete', adminKeyHash: await adminHash() });
    if (sub === 'draw' && request.method === 'POST') {
      const body = (await readBody(request)) as { participantId?: unknown; identityId?: unknown };
      if (!isParticipantId(body.participantId))
        return jsonResponse(400, { error: 'invalid', message: 'participantId' });
      const identityId =
        typeof body.identityId === 'string' ? body.identityId.slice(0, 8) : undefined;
      return await call(exec, potId, { op: 'draw', participantId: body.participantId, identityId });
    }
    if (sub === 'admin' && request.method === 'GET')
      return await call(exec, potId, { op: 'admin-view', adminKeyHash: await adminHash() });
    if (sub === 'admin' && request.method === 'POST') {
      const { action } = (await readBody(request)) as { action?: DrawPotAdminAction };
      if (!action || !ADMIN_ACTIONS.includes(action))
        return jsonResponse(400, { error: 'invalid', message: 'action' });
      return await call(exec, potId, {
        op: 'admin-action',
        adminKeyHash: await adminHash(),
        action,
      });
    }
    return jsonResponse(404, { error: 'not_found' });
  } catch {
    return jsonResponse(400, { error: 'invalid' });
  }
}
