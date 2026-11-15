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

// #702 (TTS plan slice 4, D4): Path A passes the save through (JSON or BSON) without storing it;
// companion copies of imported games are private and stay private. Steam is mocked; no network.
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

  await t.test('passes a BSON save through and stores nothing', async () => {
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
});
