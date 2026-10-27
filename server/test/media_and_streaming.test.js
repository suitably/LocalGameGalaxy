const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Media Endpoint & Streaming', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');

  const app = await createGalaxyServer({
    port: 3000,
    activePlugins: ['melodiq'],
  });

  const authHeaders = { Authorization: `Bearer ${serverConfig.token}` };

  await t.test('GET /media requires path query parameter', async () => {
    const res = await app.request('/media', { headers: authHeaders });
    assert.strictEqual(res.status, 400);
    const text = await res.text();
    assert.strictEqual(text, 'Missing path');
  });

  await t.test('GET /media rejects remote URLs with 400 Bad Request', async () => {
    const res = await app.request('/media?path=https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      headers: authHeaders,
    });
    assert.strictEqual(res.status, 400);
    const text = await res.text();
    assert.strictEqual(text, 'Remote URLs are not supported via /media');
  });

  await t.test('GET /media serves local video files with correct MIME types', async () => {
    const tempDir = path.resolve(__dirname, 'fixtures');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    serverConfig.directories.push(tempDir);

    const testFiles = [
      { name: 'test.mp4', mime: 'video/mp4' },
      { name: 'test.webm', mime: 'video/webm' },
      { name: 'test.avi', mime: 'video/x-msvideo' },
      { name: 'test.mkv', mime: 'video/x-matroska' },
      { name: 'test.mp3', mime: 'audio/mpeg' },
    ];

    try {
      for (const tf of testFiles) {
        const filePath = path.join(tempDir, tf.name);
        fs.writeFileSync(filePath, 'dummy media content');

        const res = await app.request(`/media?path=${encodeURIComponent(filePath)}`, {
          headers: authHeaders,
        });
        assert.strictEqual(res.status, 200, `Failed for ${tf.name}`);
        assert.strictEqual(
          res.headers.get('content-type'),
          tf.mime,
          `MIME mismatch for ${tf.name}`,
        );
        // Fully consume the response stream
        await res.text();
      }
    } finally {
      // Clean up files and directory after streams are consumed
      for (const tf of testFiles) {
        const filePath = path.join(tempDir, tf.name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
      serverConfig.directories = serverConfig.directories.filter((d) => d !== tempDir);
    }
  });

  await t.test(
    'GET /api/songs embeds the caller token in media URLs, never the master token',
    async () => {
      const { getSongCache, setSongCache } = require('../dist/plugins/melodiq/services/scanner.js');
      const previous = getSongCache();
      const guestKey = {
        id: 'guest',
        name: 'Guest',
        token: 'guest_song_token',
        allowManagement: false,
        allowSongDeletion: false,
        createdAt: new Date().toISOString(),
      };
      serverConfig.apiKeys.push(guestKey);
      setSongCache([
        {
          id: 's1',
          title: 'Song',
          artist: 'Artist',
          audio: '/music/song.mp3',
          video: null,
          originalAudio: null,
          folder: '/music',
          karaoke: true,
          folderScores: [],
          recordings: [],
          labels: {},
        },
      ]);
      try {
        const res = await app.request('/api/songs', {
          headers: { Authorization: `Bearer ${guestKey.token}` },
        });
        assert.strictEqual(res.status, 200);
        const text = await res.text();
        assert.ok(text.includes(`token=${guestKey.token}`), 'media URL carries the caller token');
        assert.ok(!text.includes(serverConfig.token), 'response must not contain the master token');
      } finally {
        setSongCache(previous);
        serverConfig.apiKeys.splice(serverConfig.apiKeys.indexOf(guestKey), 1);
      }
    },
  );
});
