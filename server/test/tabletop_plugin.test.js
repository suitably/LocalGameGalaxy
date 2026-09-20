const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Tabletop Plugin - Endpoints, Scanner & Media Serving', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { scanGames, getGameCache, isScanning } = require('../dist/plugins/tabletop/services/scanner.js');

  const app = await createGalaxyServer({
    port: 3000,
    activePlugins: ['tabletop'],
  });

  const tempDir = path.resolve(__dirname, 'fixtures_tabletop');
  const gameFolderDir = path.join(tempDir, 'TestGameFolder');
  const assetsDir = path.join(gameFolderDir, 'assets');

  // Setup test directories and files
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(assetsDir, { recursive: true });

  // 1. Structured game with assets folder
  const structuredGameJson = {
    name: 'Folder Game',
    author: 'Game Maker',
    description: 'A test tabletop game in a folder',
    widgets: {
      deck1: { id: 'deck1', type: 'deck', cardTypes: { A: { image: '/assets/card_a' } } },
      c1: { id: 'c1', type: 'card', deck: 'deck1' },
      h1: { id: 'h1', type: 'cardhand' },
    },
  };
  fs.writeFileSync(path.join(gameFolderDir, 'game.json'), JSON.stringify(structuredGameJson));

  // Asset files: one with extension, one extensionless PNG (magic bytes: 89 50 4e 47)
  fs.writeFileSync(path.join(assetsDir, 'card.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
  fs.writeFileSync(path.join(assetsDir, '-126126741_56719'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  // 2. Flat room-state JSON without assets
  const flatGameJson = {
    deck1: { id: 'deck1', type: 'deck', cardTypes: { Stone: {} } },
    c1: { id: 'c1', type: 'card', deck: 'deck1' },
    c2: { id: 'c2', type: 'card', deck: 'deck1' },
  };
  fs.writeFileSync(path.join(tempDir, 'flat_game.json'), JSON.stringify(flatGameJson));

  // Configure tabletop directory
  serverConfig.tabletopDirectories = [tempDir];
  await scanGames();

  await t.test('GET /api/tabletop/status returns scanner status', async () => {
    const res = await app.request('/api/tabletop/status');
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(typeof json.scanning, 'boolean');
    assert.strictEqual(json.gameCount, 2);
    assert.ok(json.localUrl.includes('3000'));
  });

  await t.test('GET /api/tabletop/games returns client-safe game entries', async () => {
    const res = await app.request('/api/tabletop/games');
    assert.strictEqual(res.status, 200);
    const games = await res.json();
    assert.strictEqual(games.length, 2);

    const folderGame = games.find((g) => g.name === 'Folder Game');
    assert.ok(folderGame, 'Folder Game should be found');
    assert.strictEqual(folderGame.author, 'Game Maker');
    assert.strictEqual(folderGame.description, 'A test tabletop game in a folder');
    assert.strictEqual(folderGame.widgetCount, 3);
    assert.strictEqual(folderGame.cardCount, 2); // deck1 (has cardTypes) + c1 (type card)
    assert.strictEqual(folderGame.format, 'pcio-folder');
    assert.strictEqual(folderGame.jsonPath, undefined, 'jsonPath must not be exposed to client');
    assert.strictEqual(folderGame.assetsDir, undefined, 'assetsDir must not be exposed to client');

    const flatGame = games.find((g) => g.name === 'flat_game');
    assert.ok(flatGame, 'Flat game should be found');
    assert.strictEqual(flatGame.format, 'flat-json');
    assert.strictEqual(flatGame.widgetCount, 3);
    assert.strictEqual(flatGame.cardCount, 3);
  });

  await t.test('GET /api/tabletop/games/:id/raw returns rawJson and assetMap', async () => {
    const cache = getGameCache();
    const folderGame = cache.find((g) => g.name === 'Folder Game');
    assert.ok(folderGame);

    const res = await app.request(`/api/tabletop/games/${folderGame.id}/raw`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.id, folderGame.id);
    assert.strictEqual(typeof body.rawJson, 'string');
    assert.ok(body.rawJson.includes('Folder Game'));

    // Check assetMap keys
    assert.ok(body.assetMap['/assets/-126126741_56719']);
    assert.ok(body.assetMap['assets/-126126741_56719']);
    assert.ok(body.assetMap['-126126741_56719']);
    assert.ok(body.assetMap['/assets/card.jpg']);

    const targetUrl = body.assetMap['-126126741_56719'];
    assert.ok(targetUrl.includes('/tabletop/media?path='));
    assert.ok(targetUrl.includes('&token='));
  });

  await t.test('GET /tabletop/media serves files with magic-bytes detection and range headers', async () => {
    const extensionlessPath = path.join(assetsDir, '-126126741_56719');
    const token = serverConfig.token || '';

    // 1. Valid fetch with magic bytes MIME (PNG)
    const res = await app.request(
      `/tabletop/media?path=${encodeURIComponent(extensionlessPath)}&token=${token}`
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
    await res.arrayBuffer();

    // 2. JPEG with extension
    const jpgPath = path.join(assetsDir, 'card.jpg');
    const resJpg = await app.request(
      `/tabletop/media?path=${encodeURIComponent(jpgPath)}&token=${token}`
    );
    assert.strictEqual(resJpg.status, 200);
    assert.strictEqual(resJpg.headers.get('content-type'), 'image/jpeg');
    await resJpg.arrayBuffer();

    // 3. Range request
    const resRange = await app.request(
      `/tabletop/media?path=${encodeURIComponent(jpgPath)}&token=${token}`,
      { headers: { range: 'bytes=0-3' } }
    );
    assert.strictEqual(resRange.status, 206);
    assert.strictEqual(resRange.headers.get('content-length'), '4');
    await resRange.arrayBuffer();

    // 4. Security check: path outside tabletopDirectories -> 403
    const forbiddenPath = path.resolve(__dirname, '../package.json');
    const resForbidden = await app.request(
      `/tabletop/media?path=${encodeURIComponent(forbiddenPath)}&token=${token}`
    );
    assert.strictEqual(resForbidden.status, 403);

    // 5. Invalid token -> 401
    const resUnauthorized = await app.request(
      `/tabletop/media?path=${encodeURIComponent(jpgPath)}&token=wrong_token`
    );
    assert.strictEqual(resUnauthorized.status, 401);
  });

  await t.test('Tabletop Config Endpoints: GET, POST, DELETE', async () => {
    // GET
    const resGet = await app.request('/api/tabletop/config');
    assert.strictEqual(resGet.status, 200);
    const jsonGet = await resGet.json();
    assert.ok(Array.isArray(jsonGet.directories));

    // POST non-existent directory -> 400
    const resPostInvalid = await app.request('/api/tabletop/config/directories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/non/existent/path/xyz' }),
    });
    assert.strictEqual(resPostInvalid.status, 400);

    // POST valid directory
    const newDir = path.join(tempDir, 'AnotherDir');
    fs.mkdirSync(newDir, { recursive: true });
    const resPostValid = await app.request('/api/tabletop/config/directories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newDir }),
    });
    assert.strictEqual(resPostValid.status, 200);
    assert.ok(serverConfig.tabletopDirectories.includes(newDir));

    // DELETE directory
    const resDelete = await app.request('/api/tabletop/config/directories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newDir }),
    });
    assert.strictEqual(resDelete.status, 200);
    assert.strictEqual(serverConfig.tabletopDirectories.includes(newDir), false);
  });

  await t.test('POST /api/tabletop/games/refresh triggers rescan', async () => {
    while (isScanning()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const res = await app.request('/api/tabletop/games/refresh', { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.message, 'Scan started');
  });

  // Cleanup test files
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  serverConfig.tabletopDirectories = [];
});
