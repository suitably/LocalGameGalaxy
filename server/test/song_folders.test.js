const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Song folders: scanner with and without .txt, song.json, song-folder routes (#568)', async (t) => {
  const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-notes-empty-'));
  process.env.NOTES_DIR = notesDir;
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const {
    getSongCache,
    scanSongs,
    initialScan,
    addOrUpdateSongInCache,
  } = require('../dist/plugins/melodiq/services/scanner.js');
  const { generateId } = require('../dist/utils/helpers.js');
  const {
    classifyUpload,
    songFolderName,
    metaFromFolderName,
    parseSongMetaBody,
  } = require('../dist/plugins/melodiq/services/songFolder.js');
  const { safeScoreFileName, parseMarksBody } = require('../dist/utils/scoreFiles.js');

  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-songs-'));
  // a karaoke song with its mix, a score with marks, an extra recording and plain XML
  const songDir = path.join(library, 'Band - Song');
  fs.mkdirSync(songDir);
  fs.writeFileSync(
    path.join(songDir, 'Band - Song.txt'),
    '#TITLE:Song\n#ARTIST:Band\n#MP3:Band - Song.mp3\n#BPM:120\n: 0 4 60 La\nE\n',
  );
  fs.writeFileSync(path.join(songDir, 'Band - Song.mp3'), 'mix');
  fs.writeFileSync(path.join(songDir, 'Take 1.webm'), 'take');
  fs.writeFileSync(path.join(songDir, 'notes.xml'), '<?xml version="1.0"?><playlist/>');
  fs.writeFileSync(path.join(songDir, 'Lead.musicxml'), '<score-partwise version="3.1"/>');
  fs.writeFileSync(
    path.join(songDir, 'Lead.musicxml.marks.json'),
    JSON.stringify({ version: 1, audio: null, offsetSec: 0, marks: [] }),
  );
  // sheet music only: no .txt, no song.json yet
  const etudeDir = path.join(library, 'Composer - Etude');
  fs.mkdirSync(etudeDir);
  fs.writeFileSync(path.join(etudeDir, 'Etude.mxl'), 'PK');
  // not songs: plain XML only, and loose sheet music in the library root
  fs.mkdirSync(path.join(library, 'Misc'));
  fs.writeFileSync(path.join(library, 'Misc', 'data.xml'), '<?xml version="1.0"?><data/>');
  fs.writeFileSync(path.join(library, 'loose.mxl'), 'PK');
  // created first: saving the config re-reads the directories, dropping the pushed test library
  const guest = serverConfig.createApiKey('guest', false, false);
  serverConfig.directories.push(library);

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq'] });
  await initialScan();
  const auth = { Authorization: `Bearer ${serverConfig.token}` };
  const json = { ...auth, 'Content-Type': 'application/json' };
  const byTitle = (title) => getSongCache().find((s) => s.title === title);
  const listAll = async () => (await app.request('/api/songs?all=1', { headers: auth })).json();
  const upload = async (id, name, content, headers = auth) => {
    const form = new FormData();
    form.append('file', new File([content], name));
    return app.request(`/api/songs/${id}/files`, { method: 'POST', headers, body: form });
  };

  t.after(() => {
    serverConfig.directories = serverConfig.directories.filter((d) => d !== library);
    delete process.env.NOTES_DIR;
    fs.rmSync(library, { recursive: true, force: true });
    fs.rmSync(notesDir, { recursive: true, force: true });
  });

  await t.test('a folder with .txt is a karaoke song with its scores and extra recordings', () => {
    const song = byTitle('Song');
    assert.ok(song);
    assert.strictEqual(song.karaoke, true);
    assert.strictEqual(path.resolve(song.folder), path.resolve(songDir));
    // plain XML that is not a score is left out
    assert.deepStrictEqual(
      song.folderScores.map((s) => s.file),
      ['Lead.musicxml'],
    );
    // the mix is the song's audio, not an extra recording
    assert.deepStrictEqual(
      song.recordings.map((r) => r.file),
      ['Take 1.webm'],
    );
  });

  let etudeId;
  await t.test('a folder with sheet music but no .txt is a song; song.json gets an id', () => {
    const etude = byTitle('Etude');
    assert.ok(etude);
    assert.strictEqual(etude.karaoke, false);
    assert.strictEqual(etude.artist, 'Composer');
    assert.strictEqual(etude.txtPath, '');
    const meta = JSON.parse(fs.readFileSync(path.join(etudeDir, 'song.json'), 'utf-8'));
    assert.strictEqual(meta.id, etude.id);
    assert.strictEqual(meta.title, 'Etude');
    etudeId = etude.id;
    assert.strictEqual(getSongCache().length, 2);
  });

  await t.test('the id of a song without .txt survives renaming its folder', async () => {
    fs.renameSync(etudeDir, path.join(library, 'Renamed'));
    await scanSongs();
    const etude = byTitle('Etude');
    assert.strictEqual(etude.id, etudeId);
    assert.strictEqual(path.basename(etude.folder), 'Renamed');
    fs.renameSync(path.join(library, 'Renamed'), etudeDir);
    await scanSongs();
  });

  await t.test('a copied folder with the same song.json id gets a new id', async () => {
    const copy = path.join(library, 'Composer - Etude copy');
    fs.cpSync(etudeDir, copy, { recursive: true });
    await scanSongs();
    const ids = getSongCache()
      .filter((s) => s.title === 'Etude')
      .map((s) => s.id);
    assert.strictEqual(ids.length, 2);
    assert.notStrictEqual(ids[0], ids[1]);
    assert.ok(ids.includes(etudeId));
    fs.rmSync(copy, { recursive: true, force: true });
    await scanSongs();
  });

  await t.test('a .txt folder without song.json keeps its .txt id and gets no song.json', () => {
    assert.strictEqual(byTitle('Song').id, generateId('Song', 'Band', 'Band - Song'));
    assert.ok(!fs.existsSync(path.join(songDir, 'song.json')));
  });

  await t.test(
    'a song.json id stays when a .txt is added later; copies still get new ids',
    async () => {
      const txt = path.join(etudeDir, 'Composer - Etude.txt');
      fs.writeFileSync(txt, '#TITLE:Etude\n#ARTIST:Composer\n: 0 4 60 La\nE\n');
      const song = await addOrUpdateSongInCache(txt);
      assert.strictEqual(song.id, etudeId);
      assert.strictEqual(song.karaoke, true);
      assert.strictEqual(getSongCache().filter((s) => s.title === 'Etude').length, 1);
      await scanSongs();
      assert.strictEqual(byTitle('Etude').id, etudeId);
      const copy = path.join(library, 'Composer - Etude copy');
      fs.cpSync(etudeDir, copy, { recursive: true });
      await scanSongs();
      const ids = getSongCache()
        .filter((s) => s.title === 'Etude')
        .map((s) => s.id);
      assert.strictEqual(ids.length, 2);
      assert.notStrictEqual(ids[0], ids[1]);
      assert.ok(ids.includes(etudeId));
      fs.rmSync(copy, { recursive: true, force: true });
      fs.rmSync(txt);
      await scanSongs();
      assert.strictEqual(byTitle('Etude').id, etudeId);
      assert.strictEqual(byTitle('Etude').karaoke, false);
    },
  );

  await t.test('Melodiq lists only karaoke songs; ?all=1 adds songs without .txt', async () => {
    const karaoke = await (await app.request('/api/songs', { headers: auth })).json();
    assert.deepStrictEqual(
      karaoke.map((s) => s.title),
      ['Song'],
    );
    const all = await listAll();
    assert.deepStrictEqual(all.map((s) => s.title).sort(), ['Etude', 'Song']);
    const song = all.find((s) => s.title === 'Song');
    assert.strictEqual(song.folderScores, undefined);
    assert.strictEqual(song.folder, undefined);
    const lead = song.scores[0];
    assert.strictEqual(lead.file, 'Lead.musicxml');
    assert.strictEqual(lead.hasMarks, true);
    assert.strictEqual(lead.label, null);
    assert.match(lead.url, /^\/media\?path=.*Lead\.musicxml&token=/);
    assert.deepStrictEqual(
      song.recordings.map((r) => r.file),
      ['Take 1.webm'],
    );
    const media = await app.request(lead.url);
    assert.strictEqual(media.status, 200);
  });

  let newId;
  await t.test('POST /api/songs creates a song folder without .txt, with song.json', async () => {
    const res = await app.request('/api/songs', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ title: 'Clair de Lune', artist: 'Debussy' }),
    });
    assert.strictEqual(res.status, 201);
    const created = await res.json();
    newId = created.id;
    assert.strictEqual(created.karaoke, false);
    const folder = path.join(library, 'Debussy - Clair de Lune');
    const meta = JSON.parse(fs.readFileSync(path.join(folder, 'song.json'), 'utf-8'));
    assert.strictEqual(meta.id, newId);
    assert.strictEqual(meta.artist, 'Debussy');
    const missing = await app.request('/api/songs', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ artist: 'x' }),
    });
    assert.strictEqual(missing.status, 400);
  });

  await t.test('uploads store scores and recordings in the song folder', async () => {
    const score = await upload(newId, 'Clair.mxl', 'PK');
    assert.strictEqual(score.status, 200);
    assert.strictEqual((await score.json()).kind, 'score');
    const rec = await upload(newId, '../Take.mp3', 'ID3');
    const stored = await rec.json();
    assert.strictEqual(stored.kind, 'recording');
    assert.strictEqual(stored.file, 'Take.mp3');
    // never overwrites
    const again = await (await upload(newId, 'Clair.mxl', 'PK2')).json();
    assert.strictEqual(again.file, 'Clair (2).mxl');
    assert.deepStrictEqual(
      again.song.scores.map((s) => s.file),
      ['Clair (2).mxl', 'Clair.mxl'],
    );
    assert.deepStrictEqual(
      again.song.recordings.map((r) => r.file),
      ['Take.mp3'],
    );
    assert.strictEqual((await upload(newId, 'evil.exe', 'x')).status, 400);
    assert.strictEqual((await upload('nope', 'a.mxl', 'PK')).status, 404);
  });

  await t.test('bar marks live next to the score in the song folder', async () => {
    const url = `/api/songs/${newId}/scores/Clair.mxl/marks`;
    assert.strictEqual((await app.request(url, { headers: auth })).status, 404);
    const body = {
      audio: 'Take.mp3',
      offsetSec: 0,
      marks: [
        { beat: 0, sec: 1 },
        { beat: 4, sec: 3 },
      ],
    };
    const put = await app.request(url, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify(body),
    });
    assert.strictEqual(put.status, 200);
    const folder = path.join(library, 'Debussy - Clair de Lune');
    assert.ok(fs.existsSync(path.join(folder, 'Clair.mxl.marks.json')));
    const read = await (await app.request(url, { headers: auth })).json();
    assert.deepStrictEqual(read.marks, body.marks);
    assert.strictEqual(read.audio, 'Take.mp3');
    const bad = await app.request(url, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ marks: [] }),
    });
    assert.strictEqual(bad.status, 400);
    const traversal = await app.request(
      `/api/songs/${newId}/scores/${encodeURIComponent('../../etc/passwd')}/marks`,
      { headers: auth },
    );
    assert.strictEqual(traversal.status, 404);
  });

  await t.test('PUT /meta stores labels and the title in song.json', async () => {
    const res = await app.request(`/api/songs/${newId}/meta`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ title: 'Clair de lune', labels: { 'Clair.mxl': 'Beginner' } }),
    });
    assert.strictEqual(res.status, 200);
    const song = await res.json();
    assert.strictEqual(song.title, 'Clair de lune');
    assert.strictEqual(song.id, newId);
    assert.strictEqual(song.scores.find((s) => s.file === 'Clair.mxl').label, 'Beginner');
    const unknown = await app.request(`/api/songs/${newId}/meta`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ labels: { 'missing.mxl': 'x' } }),
    });
    assert.strictEqual(unknown.status, 400);
  });

  await t.test(
    'deleting a score needs the deletion right and takes marks and label along',
    async () => {
      const denied = await app.request(`/api/songs/${newId}/files/Clair.mxl`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${guest.token}` },
      });
      assert.strictEqual(denied.status, 403);
      const del = await app.request(`/api/songs/${newId}/files/Clair.mxl`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.strictEqual(del.status, 200);
      const folder = path.join(library, 'Debussy - Clair de Lune');
      assert.ok(!fs.existsSync(path.join(folder, 'Clair.mxl')));
      assert.ok(!fs.existsSync(path.join(folder, 'Clair.mxl.marks.json')));
      const meta = JSON.parse(fs.readFileSync(path.join(folder, 'song.json'), 'utf-8'));
      assert.deepStrictEqual(meta.labels, {});
      // the karaoke song's mix is not an addressable file
      const mix = await app.request(`/api/songs/${byTitle('Song').id}/files/Band - Song.mp3`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.strictEqual(mix.status, 404);
      assert.ok(fs.existsSync(path.join(songDir, 'Band - Song.mp3')));
    },
  );

  await t.test('the old Notes and song-score routes are gone', async () => {
    const pieces = await app.request('/api/notes/pieces', { headers: auth });
    assert.strictEqual(pieces.status, 404);
    const scores = await app.request(`/api/songs/${byTitle('Song').id}/scores`, {
      method: 'POST',
      headers: auth,
    });
    assert.strictEqual(scores.status, 404);
  });

  await t.test('requests without a token are rejected', async () => {
    assert.strictEqual((await app.request('/api/songs?all=1')).status, 401);
    assert.strictEqual((await app.request('/api/songs', { method: 'POST' })).status, 401);
    assert.strictEqual(
      (await app.request(`/api/songs/${newId}/files/Take.mp3`, { method: 'DELETE' })).status,
      401,
    );
  });

  await t.test('deleting a song without .txt removes its folder', async () => {
    const res = await app.request(`/api/songs/${newId}`, { method: 'DELETE', headers: auth });
    assert.strictEqual(res.status, 200);
    assert.ok(!fs.existsSync(path.join(library, 'Debussy - Clair de Lune')));
  });

  await t.test('helpers', () => {
    assert.deepStrictEqual(classifyUpload('../x/Song.mxl'), { name: 'Song.mxl', kind: 'score' });
    assert.deepStrictEqual(classifyUpload('take 1.webm'), {
      name: 'take 1.webm',
      kind: 'recording',
    });
    assert.strictEqual(classifyUpload('evil.exe'), null);
    assert.strictEqual(songFolderName('../../etc', ''), '_.._etc');
    assert.deepStrictEqual(metaFromFolderName('A - B - C'), { artist: 'A', title: 'B - C' });
    assert.deepStrictEqual(metaFromFolderName('Solo'), { artist: '', title: 'Solo' });
    assert.strictEqual(typeof parseSongMetaBody({ title: '' }), 'string');
    assert.strictEqual(typeof parseSongMetaBody({ labels: [] }), 'string');
    assert.strictEqual(safeScoreFileName('a/b/../c.mxl'), 'c.mxl');
    assert.strictEqual(safeScoreFileName('song.mxl.marks.json'), null);
    assert.strictEqual(typeof parseMarksBody({ marks: [] }), 'string');
  });
});
