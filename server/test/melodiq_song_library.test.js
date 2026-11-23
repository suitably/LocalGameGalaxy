const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Melodiq song library: favourites per user, shared playlists read-only', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const configDir = path.dirname(path.resolve(process.env.CONFIG_PATH));
  const alice = serverConfig.createApiKey('Alice', false, false);
  const bob = serverConfig.createApiKey('Bob', false, false);
  // legacy playlists.json with a raw creator token: imported once, token dropped
  fs.writeFileSync(
    path.join(configDir, 'playlists.json'),
    JSON.stringify([
      { id: 'old1', name: 'Old', songs: ['s1'], creatorToken: alice.token, updatedAt: 1 },
    ]),
  );
  // album: UltraStar #ALBUM, else song.json `album`
  process.env.NOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-notes-empty-'));
  const songs = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-library-songs-'));
  fs.mkdirSync(path.join(songs, 'Band - Hit'));
  fs.writeFileSync(
    path.join(songs, 'Band - Hit', 'Band - Hit.txt'),
    '#TITLE:Hit\n#ARTIST:Band\n#ALBUM:Best Of\n#BPM:120\n: 0 4 60 La\nE\n',
  );
  fs.mkdirSync(path.join(songs, 'Composer - Etude'));
  fs.writeFileSync(path.join(songs, 'Composer - Etude', 'Lead.musicxml'), '<score-partwise/>');
  fs.writeFileSync(
    path.join(songs, 'Composer - Etude', 'song.json'),
    JSON.stringify({ version: 1, title: 'Etude', artist: 'Composer', album: 'Studies' }),
  );
  serverConfig.directories.push(songs);
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { initialScan, getSongCache } = require('../dist/plugins/melodiq/services/scanner.js');
  const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq'] });
  await initialScan();
  t.after(() => {
    for (const k of [alice, bob]) serverConfig.deleteApiKey(k.id);
    fs.rmSync(songs, { recursive: true, force: true });
  });

  await t.test('album comes from #ALBUM or song.json', () => {
    const album = (title) => getSongCache().find((s) => s.title === title)?.album;
    assert.strictEqual(album('Hit'), 'Best Of');
    assert.strictEqual(album('Etude'), 'Studies');
  });

  const call = (key, method, url, body) =>
    app.request(`/api/melodiq/library${url}`, {
      method,
      headers: {
        ...(key ? { Authorization: `Bearer ${key.token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  await t.test('needs a token', async () => {
    assert.strictEqual((await call(null, 'GET', '/favorites')).status, 401);
  });

  await t.test('favourites are stored per user', async () => {
    const put = await call(alice, 'PUT', '/favorites', { songIds: ['a', 'b', 'a', 7, '../x'] });
    assert.deepStrictEqual((await put.json()).songIds, ['a', 'b']);
    assert.deepStrictEqual((await (await call(alice, 'GET', '/favorites')).json()).songIds, [
      'a',
      'b',
    ]);
    assert.deepStrictEqual((await (await call(bob, 'GET', '/favorites')).json()).songIds, []);
    assert.strictEqual((await call(bob, 'PUT', '/favorites', { songIds: 'a' })).status, 400);
  });

  await t.test('legacy playlists are imported without the token', async () => {
    const list = await (await call(alice, 'GET', '/playlists')).json();
    const old = list.find((p) => p.id === 'old1');
    assert.strictEqual(old.mine, true);
    assert.strictEqual(old.shared, true);
    assert.strictEqual(old.ownerName, 'Alice');
    const stored = fs.readFileSync(path.join(configDir, 'melodiq-library.json'), 'utf-8');
    assert.ok(!stored.includes(alice.token));
    assert.ok(!stored.includes('creatorToken'));
  });

  await t.test('private playlists are invisible, shared ones read-only to others', async () => {
    const res = await call(alice, 'POST', '/playlists', { name: ' Party ', songs: ['a'] });
    assert.strictEqual(res.status, 201);
    const party = await res.json();
    assert.strictEqual(party.name, 'Party');
    assert.strictEqual(party.shared, false);
    assert.strictEqual(party.ownerId, undefined);

    const bobList = async () =>
      (await (await call(bob, 'GET', '/playlists')).json()).map((p) => p.id);
    assert.ok(!(await bobList()).includes(party.id));
    assert.strictEqual(
      (await call(bob, 'PUT', `/playlists/${party.id}`, { name: 'x' })).status,
      404,
    );

    const shared = await call(alice, 'PUT', `/playlists/${party.id}`, {
      shared: true,
      songs: ['a', 'b'],
    });
    assert.deepStrictEqual((await shared.json()).songs, ['a', 'b']);
    const seen = (await (await call(bob, 'GET', '/playlists')).json()).find(
      (p) => p.id === party.id,
    );
    assert.strictEqual(seen.mine, false);
    assert.strictEqual(seen.ownerName, 'Alice');
    assert.strictEqual(
      (await call(bob, 'PUT', `/playlists/${party.id}`, { name: 'x' })).status,
      403,
    );
    assert.strictEqual((await call(bob, 'DELETE', `/playlists/${party.id}`)).status, 403);
    assert.strictEqual(
      (await call(alice, 'PUT', `/playlists/${party.id}`, { name: '' })).status,
      400,
    );
    assert.strictEqual((await call(alice, 'DELETE', `/playlists/${party.id}`)).status, 200);
    assert.strictEqual((await call(alice, 'DELETE', `/playlists/${party.id}`)).status, 404);
  });

  await t.test('the old /api/playlists routes are gone', async () => {
    const res = await app.request('/api/playlists', {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    assert.strictEqual(res.status, 404);
  });
});
