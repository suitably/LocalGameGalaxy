/**
 * Draw pot rules: validation, drawing, views and host actions as pure functions
 * [ID: CF-DRAWPOT-LOGIC]
 *
 * `applyOp` takes the stored state and one operation and returns the HTTP answer plus the next
 * state. The Durable Object runs one operation at a time, so a draw can never hand the same item
 * to two people.
 */
import type {
  CreateDrawPotInput,
  DrawPotAdminAction,
  DrawPotAdminView,
  DrawPotEntry,
  DrawPotError,
  DrawPotPublicView,
  DrawPotSettings,
  DrawPotState,
  DrawRecord,
} from './types';

export const LIMITS = {
  minEntries: 1,
  maxEntries: 500,
  maxLabel: 80,
  maxTitle: 80,
  maxDescription: 300,
  maxDrawsPerParticipant: 500,
  ttlMs: 60 * 24 * 60 * 60 * 1000,
} as const;

/** Uniform random integer in [0, n). */
export type RandomInt = (n: number) => number;

export const cryptoRandomInt: RandomInt = (n) => {
  if (n <= 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
};

export const isParticipantId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);

const clean = (v: unknown, max: number) =>
  (typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Checks and normalises a create request; returns an error message or the clean input. */
export function validateCreateInput(raw: unknown): CreateDrawPotInput | string {
  if (!raw || typeof raw !== 'object') return 'body must be an object';
  const body = raw as Record<string, unknown>;
  const title = clean(body.title, LIMITS.maxTitle);
  if (!title) return 'title required';
  if (!Array.isArray(body.entries)) return 'entries must be a list';
  const entries = body.entries.map((e) => clean(e, LIMITS.maxLabel)).filter(Boolean);
  if (entries.length < LIMITS.minEntries || entries.length > LIMITS.maxEntries)
    return `between ${LIMITS.minEntries} and ${LIMITS.maxEntries} entries`;
  const s = (body.settings ?? {}) as Record<string, unknown>;
  const mode = s.mode === 'secret-santa' ? 'secret-santa' : 'pot';
  if (mode === 'secret-santa') {
    if (entries.length < 2) return 'secret santa needs at least 2 names';
    if (new Set(entries.map((e) => e.toLowerCase())).size !== entries.length)
      return 'secret santa names must be unique';
  }
  const max = s.maxDrawsPerParticipant;
  const maxDraws =
    max === null
      ? null
      : Number.isInteger(max) && (max as number) >= 1
        ? Math.min(max as number, LIMITS.maxDrawsPerParticipant)
        : 1;
  const settings: DrawPotSettings =
    mode === 'secret-santa'
      ? {
          mode,
          removeDrawn: true,
          maxDrawsPerParticipant: 1,
          hostSeesResults: s.hostSeesResults === true,
          showEntries: true,
        }
      : {
          mode,
          removeDrawn: s.removeDrawn !== false,
          maxDrawsPerParticipant: maxDraws,
          hostSeesResults: s.hostSeesResults === true,
          showEntries: s.showEntries === true,
        };
  return { title, description: clean(body.description, LIMITS.maxDescription), entries, settings };
}

/** Random derangement as one cycle (Sattolo): nobody draws themselves, no closed pairs of 2+ groups. */
export function makeAssignments(ids: string[], rand: RandomInt): Record<string, string> {
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = rand(i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const map: Record<string, string> = {};
  order.forEach((id, i) => (map[id] = order[(i + 1) % order.length]));
  return map;
}

export function createState(
  id: string,
  input: CreateDrawPotInput,
  adminKeyHash: string,
  now: number,
  rand: RandomInt,
): DrawPotState {
  const entries: DrawPotEntry[] = input.entries.map((label, i) => ({ id: String(i), label }));
  const ids = entries.map((e) => e.id);
  return {
    version: 1,
    id,
    title: input.title,
    description: input.description ?? '',
    createdAt: now,
    expiresAt: now + LIMITS.ttlMs,
    closed: false,
    settings: input.settings,
    entries,
    remaining: ids,
    assignments: input.settings.mode === 'secret-santa' ? makeAssignments(ids, rand) : {},
    draws: [],
    adminKeyHash,
  };
}

const drawsOf = (state: DrawPotState, participantId?: string) =>
  participantId ? state.draws.filter((d) => d.participantId === participantId) : [];

function drawsLeft(state: DrawPotState, participantId?: string): number | null {
  const max = state.settings.maxDrawsPerParticipant;
  if (max === null) return null;
  return Math.max(0, max - drawsOf(state, participantId).length);
}

/** Secret santa: `taken` = name already claimed. Pot mode: `taken` = drawn and out of the pot. */
function entriesWithTaken(state: DrawPotState): (DrawPotEntry & { taken: boolean })[] {
  if (state.settings.mode === 'secret-santa') {
    const claimed = new Set(state.draws.map((d) => d.identityId));
    return state.entries.map((e) => ({ ...e, taken: claimed.has(e.id) }));
  }
  const inPot = new Set(state.remaining);
  return state.entries.map((e) => ({
    ...e,
    taken: state.settings.removeDrawn && !inPot.has(e.id),
  }));
}

export function publicView(state: DrawPotState, participantId?: string): DrawPotPublicView {
  const { settings } = state;
  const visible = settings.mode === 'secret-santa' || settings.showEntries;
  const entries = visible ? entriesWithTaken(state) : null;
  return {
    id: state.id,
    title: state.title,
    description: state.description,
    closed: state.closed,
    expiresAt: state.expiresAt,
    settings,
    totalEntries: state.entries.length,
    remainingCount: settings.removeDrawn ? state.remaining.length : state.entries.length,
    entries,
    myDraws: drawsOf(state, participantId),
    drawsLeft: drawsLeft(state, participantId),
  };
}

export function adminView(state: DrawPotState): DrawPotAdminView {
  const open = state.settings.hostSeesResults;
  return {
    ...publicView(state),
    createdAt: state.createdAt,
    entries: entriesWithTaken(state),
    drawCount: state.draws.length,
    participantCount: new Set(state.draws.map((d) => d.participantId)).size,
    draws: state.draws.map((d) => ({
      ...d,
      label: open ? d.label : null,
      entryId: open ? d.entryId : null,
    })),
  };
}

export type DrawPotOp =
  | { op: 'create'; state: DrawPotState }
  | { op: 'view'; participantId?: string }
  | { op: 'draw'; participantId: string; identityId?: string }
  | { op: 'admin-view'; adminKeyHash: string }
  | { op: 'admin-action'; adminKeyHash: string; action: DrawPotAdminAction }
  | { op: 'delete'; adminKeyHash: string };

export interface OpResult {
  status: number;
  body: unknown;
  /** `undefined`: unchanged, `null`: delete the pot. */
  next?: DrawPotState | null;
}

const fail = (status: number, body: DrawPotError): OpResult => ({ status, body });

function draw(
  state: DrawPotState,
  participantId: string,
  identityId: string | undefined,
  now: number,
  rand: RandomInt,
): OpResult {
  const mine = drawsOf(state, participantId);
  const left = drawsLeft(state, participantId);
  if (state.settings.mode === 'secret-santa') {
    // a device that already drew gets its result again (lost tab, second click)
    if (mine.length > 0)
      return { status: 200, body: { draw: mine[0], pot: publicView(state, participantId) } };
    if (state.closed) return fail(409, { error: 'closed' });
    if (!identityId || !state.assignments[identityId])
      return fail(400, { error: 'identity_required' });
    if (state.draws.some((d) => d.identityId === identityId))
      return fail(409, { error: 'identity_taken' });
    const target = state.entries.find((e) => e.id === state.assignments[identityId]);
    if (!target) return fail(500, { error: 'invalid' });
    const record: DrawRecord = {
      entryId: target.id,
      label: target.label,
      participantId,
      identityId,
      at: now,
    };
    const next = {
      ...state,
      draws: [...state.draws, record],
      remaining: state.remaining.filter((id) => id !== target.id),
    };
    return { status: 200, body: { draw: record, pot: publicView(next, participantId) }, next };
  }
  if (state.closed) return fail(409, { error: 'closed' });
  if (left === 0) return fail(409, { error: 'limit_reached', myDraws: mine });
  const pool = state.settings.removeDrawn ? state.remaining : state.entries.map((e) => e.id);
  if (pool.length === 0) return fail(409, { error: 'empty' });
  const entryId = pool[rand(pool.length)];
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) return fail(500, { error: 'invalid' });
  const record: DrawRecord = { entryId, label: entry.label, participantId, at: now };
  const next: DrawPotState = {
    ...state,
    draws: [...state.draws, record],
    remaining: state.settings.removeDrawn
      ? state.remaining.filter((id) => id !== entryId)
      : state.remaining,
  };
  return { status: 200, body: { draw: record, pot: publicView(next, participantId) }, next };
}

function adminAction(
  state: DrawPotState,
  action: DrawPotAdminAction,
  rand: RandomInt,
): DrawPotState {
  if (action === 'close') return { ...state, closed: true };
  if (action === 'reopen') return { ...state, closed: false };
  const ids = state.entries.map((e) => e.id);
  return {
    ...state,
    closed: false,
    draws: [],
    remaining: ids,
    assignments: state.settings.mode === 'secret-santa' ? makeAssignments(ids, rand) : {},
  };
}

export function applyOp(
  state: DrawPotState | null,
  op: DrawPotOp,
  now: number,
  rand: RandomInt,
): OpResult {
  if (op.op === 'create') {
    if (state) return fail(409, { error: 'invalid', message: 'pot exists' });
    return { status: 201, body: { ok: true }, next: op.state };
  }
  if (!state || state.expiresAt <= now) return fail(404, { error: 'not_found' });
  switch (op.op) {
    case 'view':
      return { status: 200, body: publicView(state, op.participantId) };
    case 'draw':
      return draw(state, op.participantId, op.identityId, now, rand);
    default:
      if (op.adminKeyHash !== state.adminKeyHash) return fail(403, { error: 'forbidden' });
      if (op.op === 'delete') return { status: 200, body: { ok: true }, next: null };
      if (op.op === 'admin-view') return { status: 200, body: adminView(state) };
      {
        const next = adminAction(state, op.action, rand);
        return { status: 200, body: adminView(next), next };
      }
  }
}
