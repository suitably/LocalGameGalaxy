const test = require('node:test');
const assert = require('node:assert');

// #693: /tabletop/proxy-image is the companion fallback for image hosts without CORS. Upstream
// fetches are mocked; no network.
test('Tabletop proxy-image - allow-list and fetch', async (t) => {
  const { serverConfig } = require('../dist/config.js');
  const { createGalaxyServer } = require('../dist/core/app.js');
  const {
    isProxyImageHost,
    PROXY_IMAGE_DOMAINS,
  } = require('../dist/plugins/tabletop/routes/workshop.js');

  const app = await createGalaxyServer({ port: 3000, activePlugins: ['tabletop'] });
  const token = encodeURIComponent(serverConfig.token || '');
  const proxied = (url) =>
    app.request(`/tabletop/proxy-image?url=${encodeURIComponent(url)}&token=${token}`);

  await t.test('allow-list: Steam CDN and imgur, not every akamaihd.net customer', () => {
    assert.deepStrictEqual(PROXY_IMAGE_DOMAINS, [
      'steamusercontent.com',
      'steamcommunity.com',
      'steamusercontent-a.akamaihd.net',
      'steamuserimages-a.akamaihd.net',
      'imgur.com',
    ]);
    assert.ok(isProxyImageHost('i.imgur.com'));
    assert.ok(isProxyImageHost('cloud-3.steamusercontent.com'));
    assert.ok(isProxyImageHost('steamuserimages-a.akamaihd.net'));
    assert.ok(!isProxyImageHost('evil.akamaihd.net'));
    assert.ok(!isProxyImageHost('imgur.com.evil.example'));
  });

  await t.test('rejects hosts outside the allow-list without fetching', async () => {
    const realFetch = global.fetch;
    let called = false;
    global.fetch = async () => {
      called = true;
      return new Response('x');
    };
    try {
      const res = await proxied('https://other.akamaihd.net/x.png');
      assert.strictEqual(res.status, 403);
      assert.strictEqual(called, false);
    } finally {
      global.fetch = realFetch;
    }
  });

  await t.test('proxies an allow-listed image with CORS headers', async () => {
    const realFetch = global.fetch;
    const calls = [];
    global.fetch = async (url) => {
      calls.push(String(url));
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
    };
    try {
      const res = await proxied('https://i.imgur.com/abc.png');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(res.headers.get('content-type'), 'image/png');
      assert.deepStrictEqual(calls, ['https://i.imgur.com/abc.png']);
    } finally {
      global.fetch = realFetch;
    }
  });
});
