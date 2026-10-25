const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Song scores: import into the Notes library, deprecated song routes', async (t) => {
  const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-notes-lib-'));
  process.env.NOTES_DIR = notesDir;
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { getSongCache } = require('../dist/plugins/melodiq/services/scanner.js');
  const {
    MIGRATION_MARKER,
    migrateSongFolderScores,
  } = require('../dist/plugins/melodiq/services/scoreMigration.js');
  const { listPieces } = require('../dist/plugins/notes/services/library.js');
  const { safeScoreFileName, parseMarksBody } = require('../dist/utils/scoreFiles.js');

  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-scores-'));
  const songDir = path.join(library, 'Band - Song');
  fs.mkdirSync(songDir);
  fs.writeFileSync(
    path.join(songDir, 'Band - Song.txt'),
    '#TITLE:Song\n#ARTIST:Band\n#BPM:120\n: 0 4 60 La\nE\n',
  );
  fs.writeFileSync(path.join(songDir, 'notes.xml'), '<?xml version="1.0"?><playlist/>');
  fs.writeFileSync(path.join(songDir, 'Lead.musicxml'), '<score-partwise version="3.1"/>');
  const marks = {
    version: 1,
    audio: null,
    offsetSec: 0.2,
    marks: [
      { beat: 0, sec: 1 },
      { beat: 4, sec: 3 },
    ],
  };
  fs.writeFileSync(path.join(songDir, 'Lead.musicxml.marks.json'), JSON.stringify(marks));
  serverConfig.directories.push(library);

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq', 'notes'] });
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const song = () => getSongCache().find((s) => s.title === 'Song');
  const getSong = async () =>
    (await app.request(`/api/songs/${song().id}`, { headers: auth })).json();
  const linkedPieces = async () =>
    (await listPieces(notesDir)).filter((p) => p.songId === song()?.id);

  t.after(() => {
    serverConfig.directories = serverConfig.directories.filter((d) => d !== library);
    delete process.env.NOTES_DIR;
    fs.rmSync(library, { recursive: true, force: true });
    fs.rmSync(notesDir, { recursive: true, force: true });
  });

  await t.test(
    'startup imports song-folder scores with marks into a linked Notes piece',
    async () => {
      // The marker is written after the scores are copied: wait for the whole import, not the piece.
      for (let i = 0; i < 100 && !fs.existsSync(path.join(notesDir, MIGRATION_MARKER)); i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      const pieces = await linkedPieces();
      assert.strictEqual(pieces.length, 1);
      assert.strictEqual(pieces[0].title, 'Song');
      assert.strictEqual(pieces[0].artist, 'Band');
      // plain XML that is not a score is not imported
      assert.deepStrictEqual(
        pieces[0].scores.map((s) => s.file),
        ['Lead.musicxml'],
      );
      const copied = JSON.parse(fs.readFileSync(pieces[0].scores[0].marksPath, 'utf-8'));
      assert.deepStrictEqual(copied.marks, marks.marks);
      // non-destructive
      assert.ok(fs.existsSync(path.join(songDir, 'Lead.musicxml')));
      assert.ok(fs.existsSync(path.join(songDir, 'Lead.musicxml.marks.json')));
      assert.ok(fs.existsSync(path.join(notesDir, MIGRATION_MARKER)));
    },
  );

  await t.test('a second run imports nothing', async () => {
    assert.deepStrictEqual(await migrateSongFolderScores(getSongCache(), notesDir), {
      imported: 0,
      skipped: 1,
    });
    assert.strictEqual((await linkedPieces()).length, 1);
  });

  await t.test('a new song-folder score is imported into the existing piece', async () => {
    fs.writeFileSync(path.join(songDir, 'Bass.mid'), 'MThd');
    const { addOrUpdateSongInCache } = require('../dist/plugins/melodiq/services/scanner.js');
    await addOrUpdateSongInCache(path.join(songDir, 'Band - Song.txt'));
    const res = await migrateSongFolderScores(getSongCache(), notesDir);
    assert.strictEqual(res.imported, 1);
    const pieces = await linkedPieces();
    assert.strictEqual(pieces.length, 1);
    assert.deepStrictEqual(pieces[0].scores.map((s) => s.file).sort(), [
      'Bass.mid',
      'Lead.musicxml',
    ]);
  });

  await t.test('song listing and GET /scores read the linked Notes pieces', async () => {
    const listed = await getSong();
    assert.strictEqual(listed.folderScores, undefined);
    const lead = listed.scores.find((s) => s.file === 'Lead.musicxml');
    assert.strictEqual(lead.hasMarks, true);
    assert.match(lead.url, /^\/notes\/media\/[0-9a-f]{16}\/Lead\.musicxml\?token=/);
    assert.strictEqual(lead.pieceId, (await linkedPieces())[0].id);
    const res = await app.request(`/api/songs/${song().id}/scores`, { headers: auth });
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).length, 2);
  });

  await t.test('marks routes are aliases of the linked piece marks', async () => {
    const url = `/api/songs/${song().id}/scores/Lead.musicxml/marks`;
    const body = {
      audio: null,
      offsetSec: 0,
      marks: [
        { beat: 0, sec: 2 },
        { beat: 4, sec: 4 },
      ],
    };
    const put = await app.request(url, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify(body),
    });
    assert.strictEqual(put.status, 200);
    const piece = (await linkedPieces())[0];
    const stored = JSON.parse(
      fs.readFileSync(path.join(piece.folder, 'Lead.musicxml.marks.json'), 'utf-8'),
    );
    assert.deepStrictEqual(stored.marks, body.marks);
    assert.deepStrictEqual(
      (await (await app.request(url, { headers: auth })).json()).marks,
      body.marks,
    );
    // the song folder's original marks are left alone
    const original = JSON.parse(
      fs.readFileSync(path.join(songDir, 'Lead.musicxml.marks.json'), 'utf-8'),
    );
    assert.deepStrictEqual(original.marks, marks.marks);
    const traversal = await app.request(
      `/api/songs/${song().id}/scores/${encodeURIComponent('../../etc/passwd')}/marks`,
      { headers: auth },
    );
    assert.strictEqual(traversal.status, 404);
  });

  await t.test('uploading or deleting song scores answers 410 with a pointer', async () => {
    const form = new FormData();
    form.append('file', new File(['<score-partwise/>'], 'New.musicxml'));
    const post = await app.request(`/api/songs/${song().id}/scores`, {
      method: 'POST',
      headers: auth,
      body: form,
    });
    assert.strictEqual(post.status, 410);
    assert.match((await post.json()).use, /\/api\/notes\/pieces/);
    assert.ok(!fs.existsSync(path.join(songDir, 'New.musicxml')));
    const del = await app.request(`/api/songs/${song().id}/scores/Lead.musicxml`, {
      method: 'DELETE',
      headers: auth,
    });
    assert.strictEqual(del.status, 410);
    assert.ok(fs.existsSync(path.join(songDir, 'Lead.musicxml')));
  });

  await t.test('deleted pieces are not imported again', async () => {
    for (const p of await linkedPieces()) fs.rmSync(p.folder, { recursive: true, force: true });
    assert.strictEqual((await migrateSongFolderScores(getSongCache(), notesDir)).imported, 0);
    assert.strictEqual((await linkedPieces()).length, 0);
  });

  await t.test('helpers', () => {
    assert.strictEqual(safeScoreFileName('a/b/../c.mxl'), 'c.mxl');
    assert.strictEqual(safeScoreFileName('song.mxl.marks.json'), null);
    assert.strictEqual(safeScoreFileName('.hidden.mid'), 'hidden.mid');
    assert.strictEqual(typeof parseMarksBody({ marks: [] }), 'string');
  });
});
