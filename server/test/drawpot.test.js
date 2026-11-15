const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexumia-drawpot-'));
process.env.DRAWPOT_DIR = dir;
process.env.SECURITY_TOKEN = 'drawpot-test-token';

const { createGalaxyServer } = require('../dist/core/app.js');
const { FilePotStore } = require('../dist/plugins/drawpot/store.js');

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const json = (method, body, headers = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('draw pot plugin', async (t) => {
  const app = await createGalaxyServer({
    port: 0,
    activePlugins: ['drawpot'],
    allowedOrigins: ['https://example.org'],
  });
  const auth = { Authorization: 'Bearer drawpot-test-token' };

  await t.test('creating a pot needs the server token', async () => {
    const res = await app.request('/api/drawpot', json('POST', { title: 'T', entries: ['A'] }));
    assert.strictEqual(res.status, 401);
  });

  let pot;
  await t.test('creates a pot and stores it as a file', async () => {
    const res = await app.request(
      '/api/drawpot',
      json(
        'POST',
        {
          title: 'Teams',
          entries: ['Rot', 'Blau', 'Grün'],
          settings: { maxDrawsPerParticipant: null },
        },
        auth,
      ),
    );
    assert.strictEqual(res.status, 201);
    pot = await res.json();
    assert.ok(fs.existsSync(path.join(dir, `${pot.id}.json`)));
  });

  await t.test('draws are public, open to any origin and never repeat an entry', async () => {
    const draws = await Promise.all(
      [1, 2, 3, 4].map((i) =>
        app.request(
          `/api/drawpot/${pot.id}/draw`,
          json(
            'POST',
            { participantId: `participant-${i}` },
            { Origin: 'https://games.nexumia.de' },
          ),
        ),
      ),
    );
    assert.strictEqual(
      draws[0].headers.get('Access-Control-Allow-Origin'),
      'https://games.nexumia.de',
    );
    const ok = draws.filter((r) => r.status === 200);
    assert.strictEqual(ok.length, 3);
    const labels = await Promise.all(ok.map(async (r) => (await r.json()).draw.label));
    assert.deepStrictEqual(labels.sort(), ['Blau', 'Grün', 'Rot']);
    const empty = draws.find((r) => r.status === 409);
    assert.strictEqual((await empty.json()).error, 'empty');
  });

  await t.test('preflight allows the admin key header', async () => {
    const res = await app.request(`/api/drawpot/${pot.id}/admin`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://games.nexumia.de', 'Access-Control-Request-Method': 'GET' },
    });
    assert.match(res.headers.get('Access-Control-Allow-Headers') || '', /X-Admin-Key/i);
  });

  await t.test('host actions need the admin key; delete removes the file', async () => {
    assert.strictEqual((await app.request(`/api/drawpot/${pot.id}/admin`)).status, 403);
    const admin = await app.request(`/api/drawpot/${pot.id}/admin`, {
      headers: { 'X-Admin-Key': pot.adminKey },
    });
    assert.strictEqual((await admin.json()).drawCount, 3);
    const del = await app.request(`/api/drawpot/${pot.id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': pot.adminKey },
    });
    assert.strictEqual(del.status, 200);
    assert.ok(!fs.existsSync(path.join(dir, `${pot.id}.json`)));
  });
});

test('FilePotStore.sweep deletes expired pots only', async () => {
  const sweepDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexumia-drawpot-sweep-'));
  fs.writeFileSync(
    path.join(sweepDir, 'oldpot1.json'),
    JSON.stringify({ id: 'oldpot1', expiresAt: 10 }),
  );
  fs.writeFileSync(
    path.join(sweepDir, 'newpot1.json'),
    JSON.stringify({ id: 'newpot1', expiresAt: 1e15 }),
  );
  const store = new FilePotStore(sweepDir);
  assert.strictEqual(await store.sweep(100), 1);
  assert.deepStrictEqual(fs.readdirSync(sweepDir), ['newpot1.json']);
  fs.rmSync(sweepDir, { recursive: true, force: true });
});
