const test = require('node:test');
const assert = require('node:assert');

const { PairingStore, buildPairingUrl } = require('../dist/core/pairing.js');

const pair = (app, body) =>
  app.request('/api/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('PairingStore', async (t) => {
  await t.test('a code is single-use', () => {
    const store = new PairingStore();
    const { code } = store.issue();
    assert.strictEqual(store.redeem(code, 'a'), 'ok');
    assert.strictEqual(store.redeem(code, 'a'), 'invalid');
  });

  await t.test('a code expires after its TTL', () => {
    let now = 1000;
    const store = new PairingStore({ ttlMs: 500, now: () => now });
    const { code, expiresAt } = store.issue();
    assert.strictEqual(expiresAt, 1500);
    now = 1500;
    assert.strictEqual(store.redeem(code, 'a'), 'invalid');
  });

  await t.test('issuing a new code invalidates the previous one', () => {
    const store = new PairingStore();
    const first = store.issue();
    const second = store.issue();
    assert.notStrictEqual(first.code, second.code);
    assert.strictEqual(store.redeem(first.code, 'a'), 'invalid');
    assert.strictEqual(store.redeem(second.code, 'a'), 'ok');
  });

  await t.test('failed attempts are rate-limited per client and window', () => {
    let now = 0;
    const store = new PairingStore({ maxAttempts: 2, windowMs: 1000, now: () => now });
    const { code } = store.issue();
    assert.strictEqual(store.redeem('wrong', 'a'), 'invalid');
    assert.strictEqual(store.redeem('wrong', 'a'), 'invalid');
    // Even the right code is refused while the client is limited.
    assert.strictEqual(store.redeem(code, 'a'), 'rate_limited');
    // Other clients are not affected.
    assert.strictEqual(store.redeem('wrong', 'b'), 'invalid');
    now = 1000;
    assert.strictEqual(store.redeem(code, 'a'), 'ok');
  });

  await t.test('buildPairingUrl points at the server settings with url and code', () => {
    const url = new URL(buildPairingUrl('https://nexumia.de/', 'http://localhost:3000', 'abc'));
    assert.strictEqual(url.origin, 'https://nexumia.de');
    assert.strictEqual(url.pathname, '/settings/connectivity');
    assert.strictEqual(url.searchParams.get('tab'), null);
    assert.strictEqual(url.searchParams.get('pair'), 'http://localhost:3000');
    assert.strictEqual(url.searchParams.get('code'), 'abc');
  });
});

test('Pairing routes', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');

  await t.test('POST /api/pair trades a valid code for a working API key, once', async () => {
    const store = new PairingStore();
    const app = await createGalaxyServer({
      port: 3000,
      activePlugins: ['melodiq'],
      pairingStore: store,
    });
    const { code } = store.issue();

    const res = await pair(app, { code, name: 'Chrome on Windows' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('cache-control'), 'no-store');
    const json = await res.json();
    assert.ok(
      json.token && json.token !== serverConfig.token,
      'returns a new key, not the master token',
    );
    assert.strictEqual(json.name, 'Paired: Chrome on Windows');

    const status = await app.request('/api/status', {
      headers: { Authorization: `Bearer ${json.token}` },
    });
    assert.strictEqual(status.status, 200);

    const again = await pair(app, { code });
    assert.strictEqual(again.status, 401);

    serverConfig.deleteApiKey(json.keyId);
  });

  await t.test('POST /api/pair rejects missing or wrong codes and then rate-limits', async () => {
    const store = new PairingStore({ maxAttempts: 2 });
    const app = await createGalaxyServer({ port: 3000, activePlugins: [], pairingStore: store });
    const { code } = store.issue();
    const keysBefore = serverConfig.apiKeys.length;

    const empty = await app.request('/api/pair', { method: 'POST', body: 'not json' });
    assert.strictEqual(empty.status, 401);
    assert.strictEqual((await pair(app, { code: 'nope' })).status, 401);
    assert.strictEqual((await pair(app, { code })).status, 429);
    assert.strictEqual(serverConfig.apiKeys.length, keysBefore, 'no key created');
  });

  await t.test('POST /api/pair/code needs the master token', async () => {
    const store = new PairingStore();
    const app = await createGalaxyServer({ port: 3000, activePlugins: [], pairingStore: store });

    const anon = await app.request('/api/pair/code', { method: 'POST' });
    assert.strictEqual(anon.status, 401);

    const guest = serverConfig.createApiKey('guest', false, false);
    const asGuest = await app.request('/api/pair/code', {
      method: 'POST',
      headers: { Authorization: `Bearer ${guest.token}` },
    });
    assert.strictEqual(asGuest.status, 403);
    serverConfig.deleteApiKey(guest.id);

    const res = await app.request('/api/pair/code', {
      method: 'POST',
      headers: { Authorization: `Bearer ${serverConfig.token}` },
    });
    assert.strictEqual(res.status, 200);
    const { code, expiresAt } = await res.json();
    assert.ok(expiresAt > Date.now());
    assert.strictEqual(store.redeem(code, 'x'), 'ok');
  });
});
