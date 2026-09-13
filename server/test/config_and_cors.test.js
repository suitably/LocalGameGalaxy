const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

test('Server Config - Environment Variables & Directory Discovery', async (t) => {
  await t.test('reads PORT and SECURITY_TOKEN from environment', () => {
    const testToken = 'my_custom_secure_test_token_123';
    process.env.SECURITY_TOKEN = testToken;
    process.env.PORT = '3500';
    process.env.MUSIC_DIR = '/tmp/test_music_dir_1,/tmp/test_music_dir_2';

    const configPath = path.resolve(__dirname, '../dist/config.js');
    delete require.cache[configPath];
    const { ConfigManager } = require('../dist/config.js');
    const config = new ConfigManager();

    assert.strictEqual(config.port, 3500, 'Port should match PORT env variable');
    assert.strictEqual(config.token, testToken, 'Token should match SECURITY_TOKEN env variable');
    assert.ok(
      config.directories.includes('/tmp/test_music_dir_1'),
      'MUSIC_DIR directories should be included in config.directories'
    );
    assert.ok(
      config.directories.includes('/tmp/test_music_dir_2'),
      'MUSIC_DIR directories should be included in config.directories'
    );

    delete process.env.SECURITY_TOKEN;
    delete process.env.PORT;
    delete process.env.MUSIC_DIR;
  });

  await t.test('generates random token if none provided', () => {
    delete process.env.SECURITY_TOKEN;
    delete process.env.TOKEN;

    const configPath = path.resolve(__dirname, '../dist/config.js');
    delete require.cache[configPath];
    const { ConfigManager } = require('../dist/config.js');
    const config = new ConfigManager();

    assert.ok(config.token, 'A token should be present');
    assert.ok(config.token.length >= 16, 'Generated token should be at least 16 chars');
  });

  await t.test('createApiKey and updateApiKey operate without rate limit fields', () => {
    const configPath = path.resolve(__dirname, '../dist/config.js');
    delete require.cache[configPath];
    const { ConfigManager } = require('../dist/config.js');
    const config = new ConfigManager();

    assert.strictEqual(config.disableRateLimit, undefined, 'disableRateLimit should not exist on config');

    const newKey = config.createApiKey('Test Key', true, false);
    assert.strictEqual(newKey.name, 'Test Key');
    assert.strictEqual(newKey.allowManagement, true);
    assert.strictEqual(newKey.allowSongDeletion, false);
    assert.strictEqual(newKey.rateLimitSecond, undefined, 'rateLimitSecond must not exist');
    assert.strictEqual(newKey.rateLimitMinute, undefined, 'rateLimitMinute must not exist');
    assert.strictEqual(newKey.rateLimitHour, undefined, 'rateLimitHour must not exist');

    const updated = config.updateApiKey(newKey.id, { allowSongDeletion: true });
    assert.strictEqual(updated.allowSongDeletion, true);
    assert.strictEqual(updated.rateLimitSecond, undefined);

    config.deleteApiKey(newKey.id);
  });
});

test('Hono Server Endpoints, Auth & CORS', async (t) => {
  await t.test('GET /health and GET /api/info are accessible without token', async () => {
    const { createGalaxyServer } = require('../dist/core/app.js');
    const app = await createGalaxyServer({
      port: 3000,
      activePlugins: ['melodiq'],
    });

    const healthRes = await app.request('/health');
    assert.strictEqual(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, 'ok');

    const infoRes = await app.request('/api/info');
    assert.strictEqual(infoRes.status, 200);
    const infoJson = await infoRes.json();
    assert.strictEqual(infoJson.name, 'LocalGameGalaxy Backend Kernel');
  });

  await t.test('OPTIONS preflight returns CORS headers', async () => {
    const { createGalaxyServer } = require('../dist/core/app.js');
    const app = await createGalaxyServer({
      port: 3000,
      activePlugins: ['melodiq'],
    });

    const res = await app.request('/api/songs', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });

    assert.strictEqual(res.status, 204);
    assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
  });

  await t.test('GET /api/status requires valid token', async () => {
    const { serverConfig } = require('../dist/config.js');
    const { createGalaxyServer } = require('../dist/core/app.js');
    const app = await createGalaxyServer({
      port: 3000,
      activePlugins: ['melodiq'],
    });

    // 1. Missing token -> 401
    const resNoToken = await app.request('/api/status');
    assert.strictEqual(resNoToken.status, 401);

    // 2. Wrong token -> 401
    const resWrongToken = await app.request('/api/status', {
      headers: { Authorization: 'Bearer invalid_token_123' },
    });
    assert.strictEqual(resWrongToken.status, 401);

    // 3. Valid master token -> 200
    const resValid = await app.request('/api/status', {
      headers: { Authorization: `Bearer ${serverConfig.token}` },
    });
    assert.strictEqual(resValid.status, 200);
    const validJson = await resValid.json();
    assert.strictEqual(validJson.authenticated, true);
    assert.strictEqual(validJson.isAdmin, true);
  });

  await t.test('API key permissions: management vs guest', async () => {
    const { serverConfig } = require('../dist/config.js');
    const { createGalaxyServer } = require('../dist/core/app.js');
    const app = await createGalaxyServer({
      port: 3000,
      activePlugins: ['melodiq'],
    });

    const mgmtKey = serverConfig.createApiKey('Mgmt Key', true, true);
    const guestKey = serverConfig.createApiKey('Guest Key', false, false);

    // Management key can access /api/config/apikeys
    const resMgmt = await app.request('/api/config/apikeys', {
      headers: { Authorization: `Bearer ${mgmtKey.token}` },
    });
    assert.strictEqual(resMgmt.status, 200);

    // Guest key is rejected on /api/config/apikeys with 403
    const resGuest = await app.request('/api/config/apikeys', {
      headers: { Authorization: `Bearer ${guestKey.token}` },
    });
    assert.strictEqual(resGuest.status, 403);

    // Clean up
    serverConfig.deleteApiKey(mgmtKey.id);
    serverConfig.deleteApiKey(guestKey.id);
  });
});
