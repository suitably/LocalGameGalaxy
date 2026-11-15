import { describe, expect, it } from 'vitest';
import {
  applyOp,
  createState,
  makeAssignments,
  validateCreateInput,
  type RandomInt,
} from '../../../../../server/src/plugins/drawpot/core/logic';
import {
  DrawPotObject,
  handleDrawPot,
  type DrawPotNamespace,
} from '../../../../../cloudflare/drawPot/routes';
import type {
  CreateDrawPotInput,
  DrawPotState,
} from '../../../../../server/src/plugins/drawpot/core/types';

const first: RandomInt = () => 0;
const P1 = 'participant-1';
const P2 = 'participant-2';

function pot(
  entries: string[],
  settings: Partial<CreateDrawPotInput['settings']> = {},
): DrawPotState {
  const input = validateCreateInput({ title: 'Test', entries, settings });
  if (typeof input === 'string') throw new Error(input);
  return createState('abc123', input, 'hash', 1000, first);
}

describe('validateCreateInput', () => {
  it('trims entries and drops empty ones', () => {
    const input = validateCreateInput({
      title: ' T ',
      entries: [' Anna ', '', '  '],
      settings: {},
    });
    expect(input).toMatchObject({ title: 'T', entries: ['Anna'] });
  });

  it('rejects missing title and duplicate secret santa names', () => {
    expect(typeof validateCreateInput({ title: '', entries: ['a'] })).toBe('string');
    expect(
      typeof validateCreateInput({
        title: 'x',
        entries: ['Anna', 'anna'],
        settings: { mode: 'secret-santa' },
      }),
    ).toBe('string');
  });

  it('forces one draw per person for secret santa', () => {
    const input = validateCreateInput({
      title: 'x',
      entries: ['A', 'B'],
      settings: { mode: 'secret-santa', maxDrawsPerParticipant: null, removeDrawn: false },
    });
    expect(input).toMatchObject({ settings: { maxDrawsPerParticipant: 1, removeDrawn: true } });
  });
});

describe('makeAssignments', () => {
  it('never assigns a name to itself', () => {
    for (let n = 2; n < 12; n++) {
      const ids = Array.from({ length: n }, (_, i) => String(i));
      const map = makeAssignments(ids, (k) => Math.floor(Math.random() * k));
      expect(new Set(Object.values(map)).size).toBe(n);
      ids.forEach((id) => expect(map[id]).not.toBe(id));
    }
  });
});

describe('applyOp draw (pot mode)', () => {
  it('removes drawn items until the pot is empty', () => {
    let state = pot(['A', 'B'], { maxDrawsPerParticipant: null });
    const r1 = applyOp(state, { op: 'draw', participantId: P1 }, 2000, first);
    state = r1.next as DrawPotState;
    const r2 = applyOp(state, { op: 'draw', participantId: P1 }, 2000, first);
    state = r2.next as DrawPotState;
    expect([state.draws[0].label, state.draws[1].label].sort()).toEqual(['A', 'B']);
    expect(applyOp(state, { op: 'draw', participantId: P1 }, 2000, first)).toMatchObject({
      status: 409,
      body: { error: 'empty' },
    });
  });

  it('keeps items in the pot when removeDrawn is off', () => {
    let state = pot(['A'], { removeDrawn: false, maxDrawsPerParticipant: null });
    for (let i = 0; i < 3; i++)
      state = applyOp(state, { op: 'draw', participantId: P1 }, 1, first).next as DrawPotState;
    expect(state.draws.map((d) => d.label)).toEqual(['A', 'A', 'A']);
  });

  it('enforces the per-participant limit and returns earlier draws', () => {
    let state = pot(['A', 'B', 'C'], { maxDrawsPerParticipant: 1 });
    state = applyOp(state, { op: 'draw', participantId: P1 }, 1, first).next as DrawPotState;
    const again = applyOp(state, { op: 'draw', participantId: P1 }, 1, first);
    expect(again).toMatchObject({
      status: 409,
      body: { error: 'limit_reached', myDraws: [{ label: 'A' }] },
    });
    expect(applyOp(state, { op: 'draw', participantId: P2 }, 1, first).status).toBe(200);
  });

  it('refuses draws from a closed or expired pot', () => {
    const state = { ...pot(['A']), closed: true };
    expect(applyOp(state, { op: 'draw', participantId: P1 }, 1, first).body).toMatchObject({
      error: 'closed',
    });
    expect(applyOp(state, { op: 'view' }, state.expiresAt + 1, first).status).toBe(404);
  });
});

describe('applyOp draw (secret santa)', () => {
  it('assigns the fixed partner, blocks claimed names and repeats the result', () => {
    let state = pot(['Anna', 'Ben', 'Cem'], { mode: 'secret-santa' });
    const res = applyOp(state, { op: 'draw', participantId: P1, identityId: '0' }, 1, first);
    state = res.next as DrawPotState;
    expect(state.draws[0].entryId).toBe(state.assignments['0']);
    expect(state.draws[0].entryId).not.toBe('0');
    expect(
      applyOp(state, { op: 'draw', participantId: P2, identityId: '0' }, 1, first).body,
    ).toMatchObject({
      error: 'identity_taken',
    });
    expect(
      applyOp(state, { op: 'draw', participantId: P1, identityId: '1' }, 1, first).body,
    ).toMatchObject({
      draw: { identityId: '0' },
    });
    expect(applyOp(state, { op: 'draw', participantId: P2 }, 1, first).body).toMatchObject({
      error: 'identity_required',
    });
  });
});

describe('applyOp host actions', () => {
  it('needs the admin key and hides results unless allowed', () => {
    let state = pot(['A', 'B']);
    state = applyOp(state, { op: 'draw', participantId: P1 }, 1, first).next as DrawPotState;
    expect(applyOp(state, { op: 'admin-view', adminKeyHash: 'nope' }, 1, first).status).toBe(403);
    const view = applyOp(state, { op: 'admin-view', adminKeyHash: 'hash' }, 1, first);
    expect(view.body).toMatchObject({ drawCount: 1, draws: [{ label: null }] });
  });

  it('reset refills the pot, delete removes it', () => {
    let state = pot(['A', 'B']);
    state = applyOp(state, { op: 'draw', participantId: P1 }, 1, first).next as DrawPotState;
    const reset = applyOp(
      state,
      { op: 'admin-action', adminKeyHash: 'hash', action: 'reset' },
      1,
      first,
    );
    expect((reset.next as DrawPotState).remaining).toHaveLength(2);
    expect(applyOp(state, { op: 'delete', adminKeyHash: 'hash' }, 1, first).next).toBeNull();
  });
});

function fakeNamespace(): DrawPotNamespace {
  const objects = new Map<string, DrawPotObject>();
  return {
    idFromName: (name) => name,
    get: (id) => {
      const key = id as string;
      if (!objects.has(key)) {
        const data = new Map<string, unknown>();
        const storage = {
          get: async <T>(k: string) => data.get(k) as T | undefined,
          put: async <T>(k: string, v: T) => void data.set(k, structuredClone(v)),
          deleteAll: async () => data.clear(),
          setAlarm: async () => undefined,
          deleteAlarm: async () => undefined,
        };
        objects.set(key, new DrawPotObject({ storage }));
      }
      return objects.get(key) as DrawPotObject;
    },
  };
}

describe('handleDrawPot (HTTP)', () => {
  const base = 'https://games.nexumia.de/api/drawpot';

  it('answers 503 without the Durable Object binding', async () => {
    const res = await handleDrawPot(new Request(base, { method: 'POST', body: '{}' }), {});
    expect(res.status).toBe(503);
  });

  it('creates a pot, draws from it and checks the admin key', async () => {
    const env = { DRAW_POTS: fakeNamespace() };
    const created = await handleDrawPot(
      new Request(base, {
        method: 'POST',
        body: JSON.stringify({ title: 'Teams', entries: ['Rot', 'Blau'] }),
      }),
      env,
    );
    expect(created.status).toBe(201);
    expect(created.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const { id, adminKey } = (await created.json()) as { id: string; adminKey: string };

    const drawn = await handleDrawPot(
      new Request(`${base}/${id}/draw`, {
        method: 'POST',
        body: JSON.stringify({ participantId: P1 }),
      }),
      env,
    );
    expect(drawn.status).toBe(200);
    expect(await drawn.json()).toMatchObject({ pot: { remainingCount: 1, drawsLeft: 0 } });

    const forbidden = await handleDrawPot(new Request(`${base}/${id}/admin`), env);
    expect(forbidden.status).toBe(403);
    const admin = await handleDrawPot(
      new Request(`${base}/${id}/admin`, { headers: { 'X-Admin-Key': adminKey } }),
      env,
    );
    const adminBody = (await admin.json()) as { drawCount: number; entries: { taken: boolean }[] };
    expect(adminBody.drawCount).toBe(1);
    expect(adminBody.entries.filter((e) => e.taken)).toHaveLength(1);

    const del = await handleDrawPot(
      new Request(`${base}/${id}`, { method: 'DELETE', headers: { 'X-Admin-Key': adminKey } }),
      env,
    );
    expect(del.status).toBe(200);
    expect((await handleDrawPot(new Request(`${base}/${id}`), env)).status).toBe(404);
  });

  it('rejects invalid participant ids and pot ids', async () => {
    const env = { DRAW_POTS: fakeNamespace() };
    const bad = await handleDrawPot(
      new Request(`${base}/abcdef/draw`, {
        method: 'POST',
        body: JSON.stringify({ participantId: 'x' }),
      }),
      env,
    );
    expect(bad.status).toBe(400);
    expect((await handleDrawPot(new Request(`${base}/a!b`), env)).status).toBe(404);
  });
});
