const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const marksFor = (audio, sec = 1) => ({
  version: 1,
  audio,
  offsetSec: 0,
  marks: [
    { beat: 0, sec },
    { beat: 4, sec: sec + 2 },
  ],
});

function writePiece(notesDir, name, meta, files) {
  const dir = path.join(notesDir, name);
  fs.mkdirSync(dir, { recursive: true });
  if (meta) fs.writeFileSync(path.join(dir, 'piece.json'), JSON.stringify(meta));
  for (const [file, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, file), content);
  }
  return dir;
}

test('Notes library migration into song folders (#568)', async (t) => {
  const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-notes-old-'));
  process.env.NOTES_DIR = notesDir;
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { generateId } = require('../dist/utils/helpers.js');
  const { getSongCache, initialScan } = require('../dist/plugins/melodiq/services/scanner.js');
  const {
    MIGRATION_MARKER,
    migrateNotesPieces,
    migrateNotesPiecesOnce,
  } = require('../dist/plugins/melodiq/services/notesMigration.js');

  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-migrate-songs-'));
  const songDir = path.join(library, 'Band - Song');
  fs.mkdirSync(songDir);
  fs.writeFileSync(
    path.join(songDir, 'Band - Song.txt'),
    '#TITLE:Song\n#ARTIST:Band\n#MP3:Band - Song.mp3\n: 0 4 60 La\nE\n',
  );
  fs.writeFileSync(path.join(songDir, 'Band - Song.mp3'), 'mix');
  // imported into Notes by the earlier song-folder import: same content in both places
  fs.writeFileSync(path.join(songDir, 'Lead.musicxml'), '<score-partwise version="3.1"/>');
  // an extra recording of the same name but other content than the piece's
  fs.writeFileSync(path.join(songDir, 'Take.mp3'), 'other take');
  const songId = generateId('Song', 'Band', 'Band - Song');

  // linked piece: the identical score, a new score with marks naming the piece's recording
  writePiece(
    notesDir,
    'Band - Song',
    { title: 'Song', artist: 'Band', songId },
    {
      'Lead.musicxml': '<score-partwise version="3.1"/>',
      'Bass.mid': 'MThd',
      'Bass.mid.marks.json': JSON.stringify(marksFor('Take.mp3')),
      'Take.mp3': 'piece take',
    },
  );
  // second piece linked to the same song: a score whose name clashes
  writePiece(
    notesDir,
    'Band - Song (2)',
    { title: 'Song', artist: 'Band', songId },
    { 'Lead.musicxml': '<score-partwise version="4.0"/>' },
  );
  // unlinked piece, and one linked to a song the server no longer has
  writePiece(notesDir, 'Solo - Etude', { title: 'Etude', artist: 'Solo' }, { 'Etude.mxl': 'PK' });
  writePiece(
    notesDir,
    'Gone',
    { title: 'Gone', artist: '', songId: 'missingsong' },
    { 'Gone.mid': 'MThd' },
  );
  serverConfig.directories.push(library);

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq'] });
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  const markerPath = path.join(notesDir, MIGRATION_MARKER);
  const readMarker = () => JSON.parse(fs.readFileSync(markerPath, 'utf-8'));

  t.after(() => {
    serverConfig.directories = serverConfig.directories.filter((d) => d !== library);
    delete process.env.NOTES_DIR;
    fs.rmSync(library, { recursive: true, force: true });
    fs.rmSync(notesDir, { recursive: true, force: true });
  });

  await t.test('startup moves every piece and writes the marker', async () => {
    await initialScan();
    for (let i = 0; i < 100; i++) {
      if (fs.existsSync(markerPath) && readMarker().completedAt) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    const marker = readMarker();
    assert.ok(marker.completedAt);
    assert.deepStrictEqual(Object.keys(marker.migrated).sort(), [
      'Band - Song',
      'Band - Song (2)',
      'Gone',
      'Solo - Etude',
    ]);
  });

  await t.test('linked pieces go into their song folder; clashes get a new name', () => {
    const files = fs.readdirSync(songDir).sort();
    assert.deepStrictEqual(files, [
      'Band - Song.mp3',
      'Band - Song.txt',
      'Bass.mid',
      'Bass.mid.marks.json',
      // the identical score is not copied twice; the other one clashes
      'Lead (2).musicxml',
      'Lead.musicxml',
      'Take (2).mp3',
      'Take.mp3',
    ]);
    assert.strictEqual(fs.readFileSync(path.join(songDir, 'Take.mp3'), 'utf-8'), 'other take');
    assert.strictEqual(fs.readFileSync(path.join(songDir, 'Take (2).mp3'), 'utf-8'), 'piece take');
    // the marks follow their recording's new name
    const marks = JSON.parse(fs.readFileSync(path.join(songDir, 'Bass.mid.marks.json'), 'utf-8'));
    assert.strictEqual(marks.audio, 'Take (2).mp3');
    assert.deepStrictEqual(marks.marks, marksFor('x').marks);
  });

  await t.test('unlinked pieces become song folders without .txt, listed for Notes', () => {
    const etudeDir = path.join(library, 'Solo - Etude');
    assert.deepStrictEqual(fs.readdirSync(etudeDir).sort(), ['Etude.mxl', 'song.json']);
    const meta = JSON.parse(fs.readFileSync(path.join(etudeDir, 'song.json'), 'utf-8'));
    assert.strictEqual(meta.title, 'Etude');
    assert.strictEqual(meta.artist, 'Solo');
    const etude = getSongCache().find((s) => s.title === 'Etude');
    assert.ok(etude);
    assert.strictEqual(etude.id, meta.id);
    assert.strictEqual(etude.karaoke, false);
    // a link to a song the server no longer has is treated as unlinked
    assert.ok(fs.existsSync(path.join(library, 'Gone', 'Gone.mid')));
    const song = getSongCache().find((s) => s.title === 'Song');
    assert.deepStrictEqual(
      song.folderScores.map((s) => s.file),
      ['Bass.mid', 'Lead (2).musicxml', 'Lead.musicxml'],
    );
  });

  await t.test('the originals stay until the migration is confirmed', () => {
    assert.ok(fs.existsSync(path.join(notesDir, 'Band - Song', 'Bass.mid')));
    assert.ok(fs.existsSync(path.join(notesDir, 'Solo - Etude', 'Etude.mxl')));
  });

  await t.test('a re-run moves nothing; the marker makes startup skip it', async () => {
    const before = fs.readdirSync(library).sort();
    const res = await migrateNotesPieces();
    assert.strictEqual(res.migrated, 0);
    assert.strictEqual(res.skipped, 4);
    assert.strictEqual(await migrateNotesPiecesOnce(), null);
    assert.deepStrictEqual(fs.readdirSync(library).sort(), before);
    assert.deepStrictEqual(fs.readdirSync(songDir).length, 8);
  });

  await t.test('a piece added later is moved by a manual run', async () => {
    writePiece(notesDir, 'Late', { title: 'Late', artist: 'Band' }, { 'Late.mxl': 'PK' });
    const status = await (await app.request('/api/notes/migration', { headers: auth })).json();
    assert.strictEqual(status.pending, 1);
    const run = await app.request('/api/notes/migration/run', { method: 'POST', headers: auth });
    assert.strictEqual(run.status, 200);
    assert.strictEqual((await run.json()).migrated, 1);
    assert.ok(fs.existsSync(path.join(library, 'Band - Late', 'Late.mxl')));
  });

  await t.test('confirming removes the migrated originals (management only)', async () => {
    const guest = serverConfig.createApiKey('guest', false, false);
    serverConfig.directories.push(library);
    const denied = await app.request('/api/notes/migration/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${guest.token}` },
    });
    assert.strictEqual(denied.status, 403);
    const res = await app.request('/api/notes/migration/confirm', {
      method: 'POST',
      headers: auth,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).removed, 5);
    assert.ok(!fs.existsSync(path.join(notesDir, 'Band - Song')));
    assert.ok(readMarker().confirmedAt);
    // the song folders keep everything
    assert.ok(fs.existsSync(path.join(songDir, 'Bass.mid')));
  });
});
