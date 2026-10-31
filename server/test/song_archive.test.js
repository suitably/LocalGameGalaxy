const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

/** Reads a stored (uncompressed) ZIP through its central directory: name → content. */
function readZip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'end of central directory present');
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    assert.strictEqual(buf.readUInt32LE(p), 0x02014b50);
    assert.strictEqual(buf.readUInt16LE(p + 10), 0, 'stored');
    const crc = buf.readUInt32LE(p + 16);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const offset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf-8');
    const local = offset + 30 + buf.readUInt16LE(offset + 26);
    const data = buf.subarray(local, local + size);
    assert.strictEqual(zlib.crc32(data), crc, `CRC of ${name}`);
    files[name] = data.toString('utf-8');
    p += 46 + nameLen;
  }
  return files;
}

test('Song folder ZIP download (GET /api/songs/:id/archive)', async (t) => {
  const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-notes-empty-'));
  process.env.NOTES_DIR = notesDir;
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const { getSongCache, initialScan } = require('../dist/plugins/melodiq/services/scanner.js');
  const { zipSize } = require('../dist/utils/zipStream.js');

  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-archive-'));
  const songDir = path.join(library, 'Bänd - Song');
  fs.mkdirSync(path.join(songDir, 'stems'), { recursive: true });
  fs.writeFileSync(
    path.join(songDir, 'Song.txt'),
    '#TITLE:Song\n#ARTIST:Bänd\n#MP3:Song.mp3\n#BPM:120\n: 0 4 60 La\nE\n',
  );
  fs.writeFileSync(path.join(songDir, 'Song.mp3'), 'mix');
  fs.writeFileSync(path.join(songDir, 'Drums.gp'), 'PK-drums');
  fs.writeFileSync(path.join(songDir, 'empty.webm'), '');
  fs.writeFileSync(path.join(songDir, 'stems', 'vocals.mp3'), 'vox');
  fs.writeFileSync(path.join(songDir, '.hidden'), 'secret');
  fs.writeFileSync(
    path.join(library, 'Loose.txt'),
    '#TITLE:Loose\n#ARTIST:X\n#BPM:100\n: 0 4 60 a\nE\n',
  );
  serverConfig.directories.push(library);

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq'] });
  await initialScan();
  const song = getSongCache().find((s) => s.title === 'Song');
  const loose = getSongCache().find((s) => s.title === 'Loose');

  t.after(() => {
    serverConfig.directories = serverConfig.directories.filter((d) => d !== library);
    delete process.env.NOTES_DIR;
    fs.rmSync(library, { recursive: true, force: true });
    fs.rmSync(notesDir, { recursive: true, force: true });
  });

  await t.test(
    'streams every file of the folder, sub-folders included, hidden ones left out',
    async () => {
      const res = await app.request(`/api/songs/${song.id}/archive?token=${serverConfig.token}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/zip');
      assert.match(
        res.headers.get('content-disposition'),
        /filename\*=UTF-8''B%C3%A4nd%20-%20Song\.zip/,
      );
      const buf = Buffer.from(await res.arrayBuffer());
      assert.strictEqual(Number(res.headers.get('content-length')), buf.length);
      assert.deepStrictEqual(readZip(buf), {
        'Bänd - Song/Drums.gp': 'PK-drums',
        'Bänd - Song/Song.mp3': 'mix',
        'Bänd - Song/Song.txt':
          '#TITLE:Song\n#ARTIST:Bänd\n#MP3:Song.mp3\n#BPM:120\n: 0 4 60 La\nE\n',
        'Bänd - Song/empty.webm': '',
        'Bänd - Song/stems/vocals.mp3': 'vox',
      });
    },
  );

  await t.test('needs a token, refuses a library root and unknown songs', async () => {
    assert.strictEqual((await app.request(`/api/songs/${song.id}/archive`)).status, 401);
    const auth = { Authorization: `Bearer ${serverConfig.token}` };
    assert.ok(loose, 'loose song in the library root is scanned');
    const root = await app.request(`/api/songs/${loose.id}/archive`, { headers: auth });
    assert.strictEqual(root.status, 400);
    const missing = await app.request('/api/songs/nope/archive', { headers: auth });
    assert.strictEqual(missing.status, 404);
  });

  await t.test('zipSize matches the layout', () => {
    const entry = { name: 'a/b.txt', path: '/x', size: 5, mtime: new Date() };
    assert.strictEqual(zipSize([entry]), 30 + 16 + 46 + 2 * 7 + 5 + 22);
  });
});
