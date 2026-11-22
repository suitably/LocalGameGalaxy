const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Notes library: labelled upload, moving a song, re-scan (#563), part settings (#564)', async (t) => {
  const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-notes-links-'));
  process.env.NOTES_DIR = notesDir;
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { getSongCache, initialScan } = require('../dist/plugins/melodiq/services/scanner.js');
  const { parsePartSettings } = require('../dist/plugins/melodiq/services/partSettings.js');

  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-links-'));
  const songDir = path.join(library, 'Band - Song');
  fs.mkdirSync(songDir);
  fs.writeFileSync(
    path.join(songDir, 'Band - Song.txt'),
    '#TITLE:Song\n#ARTIST:Band\n#MP3:Band - Song.mp3\n#BPM:120\n: 0 4 60 La\nE\n',
  );
  fs.writeFileSync(path.join(songDir, 'Band - Song.mp3'), 'mix');
  fs.writeFileSync(path.join(songDir, 'Lead.musicxml'), '<score-partwise version="3.1"/>');
  // a song without .txt whose files go into the karaoke song
  const draftDir = path.join(library, 'Band - Song draft');
  fs.mkdirSync(draftDir);
  fs.writeFileSync(path.join(draftDir, 'Lead.musicxml'), '<score-partwise version="4.0"/>');
  fs.writeFileSync(
    path.join(draftDir, 'Lead.musicxml.marks.json'),
    JSON.stringify({ marks: [], offsetSec: 0, audio: 'Take.webm' }),
  );
  fs.writeFileSync(path.join(draftDir, 'Take.webm'), 'take');
  fs.writeFileSync(
    path.join(draftDir, 'song.json'),
    JSON.stringify({
      version: 1,
      id: 'draft1',
      title: 'Song',
      artist: 'Band',
      labels: { 'Lead.musicxml': 'Beginner' },
      parts: { 'Lead.musicxml': { P2: { hidden: true, playback: 'synth' } } },
    }),
  );
  serverConfig.directories.push(library);

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq'] });
  await initialScan();
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const karaoke = () => getSongCache().find((s) => s.title === 'Song' && s.karaoke);

  t.after(() => {
    serverConfig.directories = serverConfig.directories.filter((d) => d !== library);
    delete process.env.NOTES_DIR;
    fs.rmSync(library, { recursive: true, force: true });
    fs.rmSync(notesDir, { recursive: true, force: true });
  });

  await t.test('an upload with a label stores it in song.json', async () => {
    const form = new FormData();
    form.append('file', new File(['<score-partwise/>'], 'Bass.musicxml'));
    form.append('label', '  Band  ');
    const res = await app.request(`/api/songs/${karaoke().id}/files`, {
      method: 'POST',
      headers: auth,
      body: form,
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.file, 'Bass.musicxml');
    const meta = JSON.parse(fs.readFileSync(path.join(songDir, 'song.json'), 'utf-8'));
    assert.strictEqual(meta.labels['Bass.musicxml'], 'Band');
    assert.strictEqual(body.song.scores.find((s) => s.file === 'Bass.musicxml').label, 'Band');
  });

  await t.test('a karaoke song cannot be moved; an unknown target is 404', async () => {
    const bad = await app.request(`/api/songs/${karaoke().id}/merge`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ into: 'draft1' }),
    });
    assert.strictEqual(bad.status, 400);
    const missing = await app.request('/api/songs/draft1/merge', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ into: 'nope' }),
    });
    assert.strictEqual(missing.status, 404);
  });

  await t.test(
    'moving a song without .txt carries scores, marks, recordings and labels',
    async () => {
      const res = await app.request('/api/songs/draft1/merge', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ into: karaoke().id }),
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.files['Lead.musicxml'], 'Lead (2).musicxml');
      assert.ok(fs.existsSync(path.join(songDir, 'Take.webm')));
      const marks = JSON.parse(
        fs.readFileSync(path.join(songDir, 'Lead (2).musicxml.marks.json'), 'utf-8'),
      );
      assert.strictEqual(marks.audio, 'Take.webm');
      const meta = JSON.parse(fs.readFileSync(path.join(songDir, 'song.json'), 'utf-8'));
      assert.strictEqual(meta.labels['Lead (2).musicxml'], 'Beginner');
      assert.deepStrictEqual(meta.parts['Lead (2).musicxml'], {
        P2: { hidden: true, playback: 'synth' },
      });
      assert.ok(!fs.existsSync(draftDir), 'the emptied folder is removed');
      assert.ok(!getSongCache().some((s) => s.id === 'draft1'));
    },
  );

  await t.test('re-scan finds a folder added on disk and reports the migration', async () => {
    const added = path.join(library, 'Other - Piece');
    fs.mkdirSync(added);
    fs.writeFileSync(path.join(added, 'Piece.mxl'), 'PK');
    const res = await app.request('/api/notes/library/rescan', { method: 'POST', headers: auth });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.migration, 'the master token also runs the Notes migration');
    assert.ok(getSongCache().some((s) => s.title === 'Piece'));
  });

  await t.test('parsePartSettings keeps only what differs from the default (#564)', () => {
    assert.deepStrictEqual(
      parsePartSettings({
        P1: { hidden: true, playback: 'synth', name: ' Lead ' },
        P2: { hidden: false, playback: 'synth' },
        P3: { name: '' },
      }),
      { P1: { hidden: true, playback: 'synth', name: 'Lead' } },
    );
    assert.strictEqual(typeof parsePartSettings({ P1: { hidden: 'yes' } }), 'string');
    assert.strictEqual(typeof parsePartSettings({ P1: { playback: 'loud' } }), 'string');
    assert.strictEqual(typeof parsePartSettings([]), 'string');
  });

  await t.test(
    "PUT parts stores a score's part settings; deleting the score drops them",
    async () => {
      const id = karaoke().id;
      const put = (file, parts) =>
        app.request(`/api/songs/${id}/scores/${encodeURIComponent(file)}/parts`, {
          method: 'PUT',
          headers: json,
          body: JSON.stringify({ parts }),
        });
      const res = await put('Lead.musicxml', { P1: { hidden: true }, P2: { name: 'Keys' } });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.deepStrictEqual(body.scores.find((s) => s.file === 'Lead.musicxml').parts, {
        P1: { hidden: true },
        P2: { name: 'Keys' },
      });
      assert.strictEqual((await put('Missing.musicxml', {})).status, 404);
      assert.strictEqual((await put('Lead.musicxml', { P1: { hidden: 1 } })).status, 400);
      const del = await app.request(`/api/songs/${id}/files/Lead.musicxml`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.strictEqual(del.status, 200);
      const meta = JSON.parse(fs.readFileSync(path.join(songDir, 'song.json'), 'utf-8'));
      assert.strictEqual(meta.parts['Lead.musicxml'], undefined);
    },
  );
});
