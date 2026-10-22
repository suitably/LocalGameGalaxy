const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Song scores: upload, marks, delete', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const {
    addOrUpdateSongInCache,
    getSongCache,
  } = require('../dist/plugins/melodiq/services/scanner.js');
  const {
    safeScoreFileName,
    parseMarksBody,
  } = require('../dist/plugins/melodiq/services/scoreFiles.js');

  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-scores-'));
  const songDir = path.join(library, 'Band - Song');
  fs.mkdirSync(songDir);
  fs.writeFileSync(
    path.join(songDir, 'Band - Song.txt'),
    '#TITLE:Song\n#ARTIST:Band\n#BPM:120\n: 0 4 60 La\nE\n',
  );
  fs.writeFileSync(path.join(songDir, 'notes.xml'), '<?xml version="1.0"?><playlist/>');
  serverConfig.directories.push(library);

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq'] });
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  // index the song directly; the plugin's own startup scan runs concurrently
  await addOrUpdateSongInCache(path.join(songDir, 'Band - Song.txt'));
  const songId = () => getSongCache().find((s) => s.title === 'Song').id;
  const getSong = async () =>
    (await app.request(`/api/songs/${songId()}`, { headers: auth })).json();

  t.after(() => {
    serverConfig.directories = serverConfig.directories.filter((d) => d !== library);
    fs.rmSync(library, { recursive: true, force: true });
  });

  await t.test('plain XML that is not a score is ignored', async () => {
    assert.deepStrictEqual((await getSong()).scores, []);
  });

  await t.test('upload stores the file in the song folder and lists it', async () => {
    const form = new FormData();
    form.append(
      'file',
      new File(['<score-partwise version="3.1"/>'], '../Nothing Else Matters.musicxml'),
    );
    const res = await app.request(`/api/songs/${songId()}/scores`, {
      method: 'POST',
      headers: auth,
      body: form,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).file, 'Nothing Else Matters.musicxml');
    assert.ok(fs.existsSync(path.join(songDir, 'Nothing Else Matters.musicxml')));
    const song = await getSong();
    assert.strictEqual(song.scores.length, 1);
    assert.strictEqual(song.scores[0].hasMarks, false);
    assert.match(song.scores[0].url, /^\/media\?path=.*&v=\d+$/);
  });

  await t.test('a second upload with the same name gets a numbered name', async () => {
    const form = new FormData();
    form.append('file', new File(['<score-partwise/>'], 'Nothing Else Matters.musicxml'));
    const res = await app.request(`/api/songs/${songId()}/scores`, {
      method: 'POST',
      headers: auth,
      body: form,
    });
    assert.strictEqual((await res.json()).file, 'Nothing Else Matters (2).musicxml');
  });

  await t.test('other file types are rejected', async () => {
    const form = new FormData();
    form.append('file', new File(['x'], 'evil.sh'));
    const res = await app.request(`/api/songs/${songId()}/scores`, {
      method: 'POST',
      headers: auth,
      body: form,
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('marks are validated, stored and read back', async () => {
    const url = `/api/songs/${songId()}/scores/${encodeURIComponent('Nothing Else Matters.musicxml')}/marks`;
    const bad = await app.request(url, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marks: [
          { beat: 0, sec: 1 },
          { beat: 4, sec: 0.5 },
        ],
      }),
    });
    assert.strictEqual(bad.status, 400);
    const body = {
      audio: 'song.m4a',
      offsetSec: 0.1,
      marks: [
        { beat: 0, sec: 1 },
        { beat: 4, sec: 3.4 },
      ],
    };
    const ok = await app.request(url, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.strictEqual(ok.status, 200);
    const stored = await (await app.request(url, { headers: auth })).json();
    assert.deepStrictEqual(stored.marks, body.marks);
    assert.strictEqual(stored.audio, 'song.m4a');
    assert.strictEqual(
      (await getSong()).scores.find((s) => s.file === 'Nothing Else Matters.musicxml').hasMarks,
      true,
    );
  });

  await t.test('unknown score names are not found', async () => {
    const res = await app.request(
      `/api/songs/${songId()}/scores/${encodeURIComponent('../../etc/passwd')}/marks`,
      { headers: auth },
    );
    assert.strictEqual(res.status, 404);
  });

  await t.test('delete removes score and marks', async () => {
    const res = await app.request(
      `/api/songs/${songId()}/scores/${encodeURIComponent('Nothing Else Matters.musicxml')}`,
      { method: 'DELETE', headers: auth },
    );
    assert.strictEqual(res.status, 200);
    assert.ok(!fs.existsSync(path.join(songDir, 'Nothing Else Matters.musicxml')));
    assert.ok(!fs.existsSync(path.join(songDir, 'Nothing Else Matters.musicxml.marks.json')));
  });

  await t.test('helpers', () => {
    assert.strictEqual(safeScoreFileName('a/b/../c.mxl'), 'c.mxl');
    assert.strictEqual(safeScoreFileName('song.mxl.marks.json'), null);
    assert.strictEqual(safeScoreFileName('.hidden.mid'), 'hidden.mid');
    assert.strictEqual(typeof parseMarksBody({ marks: [] }), 'string');
  });
});
