const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('Song download into an existing song folder (#486)', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const {
    resolveDownloadRequest,
    songFolderTarget,
  } = require('../dist/plugins/melodiq/services/queueManager.js');
  const { videoHeader } = require('../dist/plugins/melodiq/services/ultrastarTxt.js');

  const library = fs.mkdtempSync(path.join(os.tmpdir(), 'melodiq-download-'));
  const songDir = path.join(library, 'Band - Song');
  fs.mkdirSync(songDir);
  const txtPath = path.join(songDir, 'Band - Song.txt');
  fs.writeFileSync(txtPath, '#TITLE:Song\n#ARTIST:Band\nE\n');
  const song = { id: 'abc', txtPath, artist: 'Band', title: 'Song' };
  t.after(() => fs.rmSync(library, { recursive: true, force: true }));

  await t.test('songFolderTarget gives the folder and the .txt base name', () => {
    assert.deepStrictEqual(songFolderTarget(song, [library]), {
      targetDir: songDir,
      safeName: 'Band - Song',
    });
  });

  await t.test('songFolderTarget refuses folders outside the library directories', () => {
    assert.strictEqual(songFolderTarget(song, [path.join(os.tmpdir(), 'elsewhere')]), null);
  });

  await t.test('a request with songId downloads into that folder; artist/title default', () => {
    const req = resolveDownloadRequest(
      { songId: 'abc', artist: '', title: '', youtubeUrl: 'https://youtu.be/x', targetDir: '/x' },
      [song],
      [library],
    );
    assert.strictEqual(req.targetDir, songDir);
    assert.strictEqual(req.safeName, 'Band - Song');
    assert.strictEqual(req.artist, 'Band');
    assert.strictEqual(req.title, 'Song');
    assert.strictEqual(req.youtubeUrl, 'https://youtu.be/x');
  });

  await t.test('an unknown songId is rejected, a request without one is unchanged', () => {
    assert.strictEqual(
      resolveDownloadRequest({ songId: 'nope', artist: 'a', title: 'b' }, [song], [library]),
      null,
    );
    const plain = { artist: 'a', title: 'b' };
    assert.strictEqual(resolveDownloadRequest(plain, [song], [library]), plain);
  });

  await t.test('videoHeader reads the #VIDEO value', () => {
    assert.strictEqual(videoHeader('#TITLE:x\n#VIDEO:clip.mp4\nE'), 'clip.mp4');
    assert.strictEqual(videoHeader('#TITLE:x\nE'), '');
    assert.strictEqual(videoHeader(null), '');
  });

  await t.test('POST /api/usdb/download with an unknown songId queues nothing', async () => {
    const app = await createGalaxyServer({ port: 3000, activePlugins: ['melodiq'] });
    const res = await app.request('/api/usdb/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverConfig.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ songId: 'does-not-exist', artist: 'a', title: 'b' }),
    });
    assert.strictEqual(res.status, 400);
  });
});
