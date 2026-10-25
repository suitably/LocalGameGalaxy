const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Tabletop saves and templates: permissions, unique names, ownership', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const {
    scanGames,
    getGameCache,
    isScanning,
  } = require('../dist/plugins/tabletop/services/scanner.js');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-saves-'));
  fs.writeFileSync(
    path.join(dir, 'shelf.json'),
    JSON.stringify({ name: 'Shelf Game', widgets: { a: { type: 'card' } } }),
  );
  serverConfig.tabletopDirectories = [dir];
  const app = await createGalaxyServer({ port: 3000, activePlugins: ['tabletop'] });
  while (isScanning()) await new Promise((r) => setTimeout(r, 10));
  await scanGames();
  const shelf = getGameCache().find((g) => g.name === 'Shelf Game');

  const plain = serverConfig.createApiKey('plain', false, false);
  const alice = serverConfig.createApiKey('Alice', false, false, { allowTabletopSaves: true });
  const bob = serverConfig.createApiKey('Bob', false, false, {
    allowTabletopSaves: true,
    allowTabletopTemplates: true,
  });
  t.after(() => {
    for (const k of [plain, alice, bob]) serverConfig.deleteApiKey(k.id);
    serverConfig.tabletopDirectories = [];
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const call = (key, method, url, body) =>
    app.request(url, {
      method,
      headers: {
        Authorization: `Bearer ${key.token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const state = (n) => ({
    name: 'Shelf Game',
    widgets: Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i}`, { type: 'card' }])),
  });

  let aliceSave;
  await t.test('saving needs allowTabletopSaves; the status reports the rights', async () => {
    const denied = await call(plain, 'POST', '/api/tabletop/saves', {
      name: 'Round 1',
      gameId: shelf.id,
      game: state(1),
    });
    assert.strictEqual(denied.status, 403);
    const status = await (await call(plain, 'GET', '/api/tabletop/status')).json();
    assert.deepStrictEqual(status.permissions, { saveStates: false, saveTemplates: false });

    const res = await call(alice, 'POST', '/api/tabletop/saves', {
      name: 'Round 1',
      gameId: shelf.id,
      game: state(2),
    });
    assert.strictEqual(res.status, 201);
    aliceSave = await res.json();
    assert.strictEqual(aliceSave.ownerName, 'Alice');
    assert.strictEqual(aliceSave.mine, true);
    // stored outside the scanned library
    assert.strictEqual(
      getGameCache().some((g) => g.name === 'Round 1'),
      false,
    );
    assert.ok(fs.existsSync(path.join(dir, '.states', 'saves', `${aliceSave.id}.json`)));
  });

  await t.test('names are unique per game; a conflict suggests "name (2)"', async () => {
    const res = await call(bob, 'POST', '/api/tabletop/saves', {
      name: ' round 1 ',
      gameId: shelf.id,
      game: state(1),
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual((await res.json()).suggestion, 'round 1 (2)');
  });

  await t.test('others can load but not overwrite or delete a save', async () => {
    const list = await (await call(bob, 'GET', `/api/tabletop/saves?gameId=${shelf.id}`)).json();
    assert.strictEqual(list.saves.length, 1);
    assert.strictEqual(list.saves[0].mine, false);
    assert.strictEqual(list.permissions.saveTemplates, true);

    const loaded = await (await call(plain, 'GET', `/api/tabletop/saves/${aliceSave.id}`)).json();
    assert.strictEqual(Object.keys(loaded.game.widgets).length, 2);

    const put = await call(bob, 'PUT', `/api/tabletop/saves/${aliceSave.id}`, {
      name: 'Round 1',
      gameId: shelf.id,
      game: state(9),
    });
    assert.strictEqual(put.status, 403);
    const del = await call(bob, 'DELETE', `/api/tabletop/saves/${aliceSave.id}`);
    assert.strictEqual(del.status, 403);

    const copy = await call(bob, 'POST', '/api/tabletop/saves', {
      name: 'Round 1 (2)',
      gameId: shelf.id,
      game: loaded.game,
    });
    assert.strictEqual(copy.status, 201);
  });

  await t.test('the owner overwrites and deletes their save', async () => {
    const put = await call(alice, 'PUT', `/api/tabletop/saves/${aliceSave.id}`, {
      name: 'Round 1',
      gameId: shelf.id,
      game: state(4),
    });
    assert.strictEqual(put.status, 200);
    const loaded = await (await call(alice, 'GET', `/api/tabletop/saves/${aliceSave.id}`)).json();
    assert.strictEqual(Object.keys(loaded.game.widgets).length, 4);
    const del = await call(alice, 'DELETE', `/api/tabletop/saves/${aliceSave.id}`);
    assert.strictEqual(del.status, 200);
  });

  await t.test('templates need allowTabletopTemplates and replace the raw game', async () => {
    const url = `/api/tabletop/games/${shelf.id}/template`;
    assert.strictEqual((await call(alice, 'PUT', url, { game: state(3) })).status, 403);
    assert.strictEqual((await call(bob, 'PUT', url, { game: state(3) })).status, 200);
    const raw = await (await call(plain, 'GET', `/api/tabletop/games/${shelf.id}/raw`)).json();
    assert.strictEqual(raw.template, true);
    assert.strictEqual(Object.keys(JSON.parse(raw.rawJson).widgets).length, 3);

    assert.strictEqual((await call(bob, 'DELETE', url)).status, 200);
    const original = await (await call(plain, 'GET', `/api/tabletop/games/${shelf.id}/raw`)).json();
    assert.strictEqual(original.template, false);
    assert.strictEqual(Object.keys(JSON.parse(original.rawJson).widgets).length, 1);
  });
});
