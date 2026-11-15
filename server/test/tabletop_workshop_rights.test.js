const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** A minimal BSON document `{ SaveName: 'T' }`: int32 length, string element, terminator. */
function bsonSave() {
  const name = Buffer.from('SaveName\0');
  const value = Buffer.from('T\0');
  const len = 4 + 1 + name.length + 4 + value.length + 1;
  const buf = Buffer.alloc(len);
  let o = buf.writeInt32LE(len, 0);
  o = buf.writeUInt8(0x02, o);
  o += name.copy(buf, o);
  o = buf.writeInt32LE(value.length, o);
  o += value.copy(buf, o);
  buf.writeUInt8(0, o);
  return buf;
}

// #702 (TTS plan slice 4, D4): Path A passes the save through (JSON or BSON); companion copies of
// imported games are marked private (only on this companion) and stay so. Steam is mocked.
test('Tabletop workshop rights - pass-through download and private copies', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { detectSaveEncoding } = require('../dist/plugins/tabletop/routes/workshop.js');
  const { getGameCache } = require('../dist/plugins/tabletop/services/scanner.js');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tabletop-rights-'));
  serverConfig.tabletopDirectories = [dir];
  const app = await createGalaxyServer({ port: 3000, activePlugins: ['tabletop'] });
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const realFetch = global.fetch;

  t.after(() => {
    global.fetch = realFetch;
    serverConfig.tabletopDirectories = [];
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Steam answers the details call, then serves `file` as the save. */
  const mockSteam = (file) => {
    global.fetch = async (url) => {
      if (String(url).includes('GetPublishedFileDetails')) {
        return Response.json({
          response: {
            result: 1,
            resultcount: 1,
            publishedfiledetails: [{ result: 1, publishedfileid: '42', file_url: 'https://x/f' }],
          },
        });
      }
      return new Response(file);
    };
  };

  await t.test('detects JSON and BSON saves', () => {
    assert.strictEqual(detectSaveEncoding(Buffer.from('  {"SaveName":"T"}')), 'json');
    assert.strictEqual(detectSaveEncoding(bsonSave()), 'bson');
    assert.strictEqual(detectSaveEncoding(Buffer.from('<html>')), null);
  });

  await t.test('passes a BSON save through (storing is the import route)', async () => {
    const save = bsonSave();
    mockSteam(save);
    const res = await app.request('/api/tabletop/workshop/42', { headers: auth });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/octet-stream');
    assert.deepStrictEqual(Buffer.from(await res.arrayBuffer()), save);
    assert.strictEqual(fs.existsSync(path.join(dir, 'workshop')), false);
  });

  await t.test('passes a JSON save through', async () => {
    mockSteam('{"SaveName":"T","ObjectStates":[]}');
    const res = await app.request('/api/tabletop/workshop/42', { headers: auth });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), '{"SaveName":"T","ObjectStates":[]}');
  });

  await t.test('rejects files that are neither JSON nor BSON', async () => {
    mockSteam('<html>not a save</html>');
    const res = await app.request('/api/tabletop/workshop/42', { headers: auth });
    assert.strictEqual(res.status, 422);
  });

  await t.test(
    'lists a companion copy of an imported game as private, and keeps it so',
    async () => {
      global.fetch = realFetch;
      const game = {
        name: 'Imported',
        format: 'tts-workshop',
        companionPrivate: true,
        widgets: { c1: { type: 'card' } },
      };
      const created = await app.request('/api/tabletop/games', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ game }),
      });
      assert.strictEqual(created.status, 201);
      const entry = await created.json();
      assert.strictEqual(entry.private, true);
      assert.strictEqual(entry.format, 'tts-workshop');

      // an overwrite without the flag cannot make it public again
      const { companionPrivate: _drop, format: _format, ...stripped } = game;
      const res = await app.request(`/api/tabletop/games/${entry.id}`, {
        method: 'PUT',
        headers: json,
        body: JSON.stringify({ game: stripped }),
      });
      assert.strictEqual((await res.json()).private, true);
      const stored = getGameCache().find((g) => g.id === entry.id);
      const onDisk = JSON.parse(fs.readFileSync(stored.jsonPath, 'utf-8'));
      assert.strictEqual(onDisk.companionPrivate, true);
    },
  );

  await t.test('own games are not private', async () => {
    const res = await app.request('/api/tabletop/games', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ game: { name: 'Own', widgets: { c1: { type: 'card' } } } }),
    });
    assert.strictEqual((await res.json()).private, undefined);
  });

  // Maintainer decision 2026-11-15: the companion stores imported Workshop games with their
  // images for everyone who uses it. Image hosts are mocked; no network, no Workshop content.
  await t.test('stores an imported Workshop game with its images for every client', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const fetched = [];
    global.fetch = async (url) => {
      fetched.push(String(url));
      return new Response(png, { headers: { 'content-type': 'image/png' } });
    };
    const img = 'https://steamusercontent-a.akamaihd.net/ugc/1/face.png';
    const bg = 'https://i.imgur.com/table.jpg';
    const game = {
      name: 'Workshop Game',
      supportedModes: ['party'],
      table: { width: 1600, height: 1000, backgroundImageUrl: bg },
      widgets: {
        c1: { id: 'c1', type: 'card', image: img },
        c2: { id: 'c2', type: 'card', image: img },
        t1: { id: 't1', type: 'token', image: 'http://192.168.1.10/x.png' },
      },
    };
    const res = await app.request('/api/tabletop/workshop/123456/import', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ game }),
    });
    assert.strictEqual(res.status, 201);
    const entry = await res.json();
    assert.strictEqual(entry.private, true);
    assert.strictEqual(entry.format, 'tts-workshop');
    assert.strictEqual(entry.saved, true);
    assert.strictEqual(entry.assets.total, 3);
    assert.ok(fs.existsSync(path.join(dir, 'saved', 'workshop-123456', 'game.json')));

    let status;
    for (let i = 0; i < 50; i++) {
      status = await (
        await app.request(`/api/tabletop/workshop/assets/${entry.id}`, { headers: auth })
      ).json();
      if (!status.running) break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.deepStrictEqual(status, { total: 3, stored: 2, failed: 1, running: false });
    // the private-network image is never fetched (no SSRF)
    assert.deepStrictEqual(fetched.sort(), [img, bg].sort());

    // another client (API key without extra permissions) lists, loads and gets the images
    const other = serverConfig.createApiKey('Other device', false, false);
    const otherAuth = { Authorization: `Bearer ${other.token}` };
    const list = await (await app.request('/api/tabletop/games', { headers: otherAuth })).json();
    assert.ok(list.some((g) => g.id === entry.id && g.private === true));
    const raw = await (
      await app.request(`/api/tabletop/games/${entry.id}/raw`, { headers: otherAuth })
    ).json();
    const stored = JSON.parse(raw.rawJson);
    assert.strictEqual(stored.companionPrivate, true);
    assert.strictEqual(stored.workshopId, '123456');
    assert.strictEqual(stored.widgets.c1.image, img);

    global.fetch = async () => {
      throw new Error('stored copies must not hit the network');
    };
    const asset = await app.request(
      `/tabletop/stored-asset?url=${encodeURIComponent(img)}&token=${encodeURIComponent(other.token)}`,
    );
    assert.strictEqual(asset.status, 200);
    assert.strictEqual(asset.headers.get('content-type'), 'image/png');
    assert.deepStrictEqual(new Uint8Array(await asset.arrayBuffer()), png);
    const missing = await app.request(
      `/tabletop/stored-asset?url=${encodeURIComponent('https://x.example/none.png')}`,
      { headers: otherAuth },
    );
    assert.strictEqual(missing.status, 404);
    const anonymous = await app.request(`/tabletop/stored-asset?url=${encodeURIComponent(img)}`);
    assert.strictEqual(anonymous.status, 401);

    // a re-import of the same item overwrites the stored game
    global.fetch = async () => new Response(png, { headers: { 'content-type': 'image/png' } });
    const again = await (
      await app.request('/api/tabletop/workshop/123456/import', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ game: { ...game, name: 'Workshop Game v2' } }),
      })
    ).json();
    assert.strictEqual(again.id, entry.id);
    assert.strictEqual(again.name, 'Workshop Game v2');
  });

  await t.test('rejects invalid import requests', async () => {
    const bad = await app.request('/api/tabletop/workshop/abc/import', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ game: { name: 'x', widgets: {} } }),
    });
    assert.strictEqual(bad.status, 400);
    const noGame = await app.request('/api/tabletop/workshop/1/import', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({}),
    });
    assert.strictEqual(noGame.status, 400);
  });

  await t.test('only public hosts count as image URLs', () => {
    const { isPublicImageUrl } = require('../dist/plugins/tabletop/services/workshopAssets.js');
    assert.ok(isPublicImageUrl('https://i.imgur.com/a.png'));
    for (const u of [
      'http://localhost/a.png',
      'http://127.0.0.1/a.png',
      'http://10.0.0.5/a.png',
      'http://172.20.1.1/a.png',
      'http://[::1]/a.png',
      'file:///etc/passwd',
    ]) {
      assert.strictEqual(isPublicImageUrl(u), false, u);
    }
  });
});
