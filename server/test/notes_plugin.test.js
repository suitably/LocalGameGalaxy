const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Notes plugin: pieces, scores, recordings, marks', async (t) => {
  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-notes-'));
  process.env.NOTES_DIR = library;
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { classifyUpload, folderNameFor } = require('../dist/plugins/notes/services/library.js');

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['notes'] });
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const upload = async (id, name, content) => {
    const form = new FormData();
    form.append('file', new File([content], name));
    return app.request(`/api/notes/pieces/${id}/files`, {
      method: 'POST',
      headers: auth,
      body: form,
    });
  };

  t.after(() => {
    delete process.env.NOTES_DIR;
    fs.rmSync(library, { recursive: true, force: true });
  });

  await t.test('uses NOTES_DIR', () => {
    assert.strictEqual(serverConfig.notesDir, library);
  });

  await t.test('rejects requests without a token', async () => {
    assert.strictEqual((await app.request('/api/notes/pieces')).status, 401);
  });

  await t.test('classifies uploads and builds safe folder names', () => {
    assert.deepStrictEqual(classifyUpload('../x/Song.mxl'), { name: 'Song.mxl', kind: 'score' });
    assert.deepStrictEqual(classifyUpload('take 1.webm'), {
      name: 'take 1.webm',
      kind: 'recording',
    });
    assert.strictEqual(classifyUpload('evil.exe'), null);
    assert.strictEqual(folderNameFor({ title: '../../etc', artist: '' }), '_.._etc');
  });

  let id;
  await t.test('creates a piece folder with piece.json', async () => {
    const res = await app.request('/api/notes/pieces', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ title: 'Clair de Lune', artist: 'Debussy' }),
    });
    assert.strictEqual(res.status, 201);
    const piece = await res.json();
    id = piece.id;
    assert.strictEqual(piece.title, 'Clair de Lune');
    assert.ok(fs.existsSync(path.join(library, 'Debussy - Clair de Lune', 'piece.json')));
    const missing = await app.request('/api/notes/pieces', {
      method: 'POST',
      headers: json,
      body: '{}',
    });
    assert.strictEqual(missing.status, 400);
  });

  await t.test('stores a score and a recording and lists both', async () => {
    assert.strictEqual((await upload(id, 'Clair.mxl', 'PK-zip')).status, 200);
    const rec = await (await upload(id, 'Take.mp3', 'ID3-audio')).json();
    assert.strictEqual(rec.kind, 'recording');
    assert.strictEqual((await upload(id, 'virus.exe', 'x')).status, 400);
    // a second upload of the same name never overwrites
    assert.strictEqual((await (await upload(id, 'Take.mp3', 'ID3')).json()).file, 'Take (2).mp3');

    const piece = await (await app.request(`/api/notes/pieces/${id}`, { headers: auth })).json();
    assert.deepStrictEqual(
      piece.scores.map((s) => s.file),
      ['Clair.mxl'],
    );
    assert.deepStrictEqual(
      piece.recordings.map((r) => r.file),
      ['Take (2).mp3', 'Take.mp3'],
    );
    assert.match(piece.recordings[1].url, /^\/notes\/media\/[0-9a-f]{16}\/Take\.mp3\?token=/);
  });

  await t.test('streams media with range support', async () => {
    const res = await app.request(`/notes/media/${id}/Take.mp3`, {
      headers: { ...auth, Range: 'bytes=0-2' },
    });
    assert.strictEqual(res.status, 206);
    assert.strictEqual(res.headers.get('content-type'), 'audio/mpeg');
    assert.strictEqual(await res.text(), 'ID3');
    const traversal = await app.request(`/notes/media/${id}/..%2Fpiece.json`, { headers: auth });
    assert.strictEqual(traversal.status, 404);
  });

  await t.test('stores and reads bar marks', async () => {
    const marksUrl = `/api/notes/pieces/${id}/scores/Clair.mxl/marks`;
    assert.strictEqual((await app.request(marksUrl, { headers: auth })).status, 404);
    const put = await app.request(marksUrl, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({
        marks: [
          { beat: 0, sec: 0.5 },
          { beat: 4, sec: 2.5 },
        ],
        audio: 'Take.mp3',
      }),
    });
    assert.strictEqual(put.status, 200);
    const stored = await (await app.request(marksUrl, { headers: auth })).json();
    assert.strictEqual(stored.audio, 'Take.mp3');
    const piece = await (await app.request(`/api/notes/pieces/${id}`, { headers: auth })).json();
    assert.strictEqual(piece.scores[0].hasMarks, true);
  });

  await t.test('renames a piece without moving its folder', async () => {
    const res = await app.request(`/api/notes/pieces/${id}`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ title: 'Clair de lune (L. 32)', artist: 'Debussy' }),
    });
    assert.strictEqual((await res.json()).title, 'Clair de lune (L. 32)');
    assert.ok(fs.existsSync(path.join(library, 'Debussy - Clair de Lune')));
  });

  await t.test('links a piece to a Melodiq song and keeps the link on rename', async () => {
    const put = (body) =>
      app.request(`/api/notes/pieces/${id}`, {
        method: 'PUT',
        headers: json,
        body: JSON.stringify(body),
      });
    const bad = await put({ title: 'Clair', songId: '../x' });
    assert.strictEqual(bad.status, 400);
    assert.strictEqual(
      (await (await put({ title: 'Clair', songId: 'abc123' })).json()).songId,
      'abc123',
    );
    // songId left out keeps the link
    assert.strictEqual((await (await put({ title: 'Clair de Lune' })).json()).songId, 'abc123');
    const listed = await (await app.request(`/api/notes/pieces/${id}`, { headers: auth })).json();
    assert.strictEqual(listed.songId, 'abc123');
    // null removes it
    assert.strictEqual(
      (await (await put({ title: 'Clair de Lune', songId: null })).json()).songId,
      null,
    );
  });

  await t.test('deletes files and pieces only with deletion rights', async () => {
    const key = serverConfig.createApiKey('notes-test', false, false);
    t.after(() => serverConfig.deleteApiKey(key.id));
    const denied = await app.request(`/api/notes/pieces/${id}/files/Clair.mxl`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key.token}` },
    });
    assert.strictEqual(denied.status, 403);

    const del = await app.request(`/api/notes/pieces/${id}/files/Clair.mxl`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.strictEqual(del.status, 200);
    const dir = path.join(library, 'Debussy - Clair de Lune');
    assert.strictEqual(fs.existsSync(path.join(dir, 'Clair.mxl.marks.json')), false);

    assert.strictEqual(
      (await app.request(`/api/notes/pieces/${id}`, { method: 'DELETE', headers: auth })).status,
      200,
    );
    assert.strictEqual(fs.existsSync(dir), false);
    assert.deepStrictEqual(
      await (await app.request('/api/notes/pieces', { headers: auth })).json(),
      [],
    );
  });
});
