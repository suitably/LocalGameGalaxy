const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Tabletop library: save, overwrite, delete games', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { getGameCache, isSavedGame } = require('../dist/plugins/tabletop/services/scanner.js');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-library-'));
  fs.writeFileSync(
    path.join(dir, 'read-only.json'),
    JSON.stringify({ name: 'Shelf Game', widgets: { a: { type: 'card' } } }),
  );
  serverConfig.tabletopDirectories = [dir];
  const app = await createGalaxyServer({ port: 3000, activePlugins: ['tabletop'] });
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const game = (name, cards) => ({
    name,
    widgets: Object.fromEntries(
      Array.from({ length: cards }, (_, i) => [`c${i}`, { type: 'card' }]),
    ),
  });

  t.after(() => {
    serverConfig.tabletopDirectories = [];
    fs.rmSync(dir, { recursive: true, force: true });
  });

  let saved;
  await t.test('saves a new game into saved/<name>/game.json', async () => {
    const res = await app.request('/api/tabletop/games', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ game: game('My Game', 2) }),
    });
    assert.strictEqual(res.status, 201);
    saved = await res.json();
    assert.strictEqual(saved.saved, true);
    assert.strictEqual(saved.cardCount, 2);
    assert.ok(fs.existsSync(path.join(dir, 'saved', 'My Game', 'game.json')));
    assert.ok(getGameCache().some((g) => g.id === saved.id));
  });

  await t.test('never reuses a folder and rejects non-games', async () => {
    const second = await (
      await app.request('/api/tabletop/games', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ rawJson: JSON.stringify(game('My Game', 1)) }),
      })
    ).json();
    assert.notStrictEqual(second.id, saved.id);
    assert.ok(fs.existsSync(path.join(dir, 'saved', 'My Game (2)', 'game.json')));

    const bad = await app.request('/api/tabletop/games', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ game: { name: 'Nope', hello: 'world' } }),
    });
    assert.strictEqual(bad.status, 400);
    assert.strictEqual(fs.existsSync(path.join(dir, 'saved', 'Nope')), false);
  });

  await t.test('overwrites a saved game and keeps it when the update is not a game', async () => {
    const res = await app.request(`/api/tabletop/games/${saved.id}`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ game: game('My Game', 5) }),
    });
    assert.strictEqual((await res.json()).cardCount, 5);
    const bad = await app.request(`/api/tabletop/games/${saved.id}`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ game: { broken: true } }),
    });
    assert.strictEqual(bad.status, 400);
    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, 'saved', 'My Game', 'game.json'), 'utf-8'),
    );
    assert.strictEqual(Object.keys(raw.widgets).length, 5);
  });

  await t.test('games outside saved/ stay read-only', async () => {
    const { scanGames } = require('../dist/plugins/tabletop/services/scanner.js');
    await scanGames();
    const shelf = getGameCache().find((g) => g.name === 'Shelf Game');
    assert.strictEqual(isSavedGame(shelf), false);
    const res = await app.request(`/api/tabletop/games/${shelf.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.strictEqual(res.status, 403);
    const list = await (await app.request('/api/tabletop/games', { headers: auth })).json();
    assert.strictEqual(list.find((g) => g.name === 'Shelf Game').saved, false);
  });

  await t.test('deletes a saved game only with deletion rights', async () => {
    const key = serverConfig.createApiKey('tt-test', false, false);
    t.after(() => serverConfig.deleteApiKey(key.id));
    const denied = await app.request(`/api/tabletop/games/${saved.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key.token}` },
    });
    assert.strictEqual(denied.status, 403);
    const res = await app.request(`/api/tabletop/games/${saved.id}`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(fs.existsSync(path.join(dir, 'saved', 'My Game')), false);
    assert.strictEqual(
      getGameCache().some((g) => g.id === saved.id),
      false,
    );
  });
});
