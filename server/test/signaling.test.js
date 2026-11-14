const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { WebSocket } = require('ws');

const { SignalingHub, attachSignaling, SIGNALING_PATH } = require('../dist/core/signaling.js');

const HASH = 'ROOM1ROOM1ROOM1ROOM1';
const id = (ch) => ch.repeat(20);

const fakeConn = () => {
  const sent = [];
  return { sent, swarms: new Map(), send: (json) => sent.push(JSON.parse(json)) };
};
const announce = (peer, extra = {}) =>
  JSON.stringify({ action: 'announce', info_hash: HASH, peer_id: id(peer), ...extra });

test('SignalingHub', async (t) => {
  await t.test('answers an announce with interval and swarm size', () => {
    const hub = new SignalingHub();
    const a = fakeConn();
    hub.handleMessage(a, announce('a'));
    assert.strictEqual(a.sent.length, 1);
    assert.strictEqual(a.sent[0].info_hash, HASH);
    assert.strictEqual(a.sent[0].incomplete, 1);
    assert.ok(a.sent[0].interval > 0);
  });

  await t.test('forwards offers to other peers and the answer back to the offerer', () => {
    const hub = new SignalingHub();
    const host = fakeConn();
    const phone = fakeConn();
    hub.handleMessage(host, announce('h'));
    hub.handleMessage(
      phone,
      announce('p', { offers: [{ offer: { type: 'offer', sdp: 'x' }, offer_id: 'o1' }] }),
    );
    const offer = host.sent.find((m) => m.offer);
    assert.deepStrictEqual(offer, {
      action: 'announce',
      offer: { type: 'offer', sdp: 'x' },
      offer_id: 'o1',
      peer_id: id('p'),
      info_hash: HASH,
    });

    hub.handleMessage(
      host,
      announce('h', { to_peer_id: id('p'), offer_id: 'o1', answer: { type: 'answer', sdp: 'y' } }),
    );
    const answer = phone.sent.find((m) => m.answer);
    assert.strictEqual(answer.peer_id, id('h'));
    assert.strictEqual(answer.offer_id, 'o1');
    // an answer is not acknowledged with a second announce response
    assert.strictEqual(host.sent.filter((m) => m.interval).length, 1);
  });

  await t.test('never sends a peer its own offers and spreads offers over distinct peers', () => {
    const hub = new SignalingHub();
    const a = fakeConn();
    const b = fakeConn();
    const c = fakeConn();
    hub.handleMessage(a, announce('a'));
    hub.handleMessage(b, announce('b'));
    const offers = ['o1', 'o2', 'o3'].map((offer_id) => ({ offer: { sdp: offer_id }, offer_id }));
    hub.handleMessage(c, announce('c', { offers }));
    assert.strictEqual(a.sent.filter((m) => m.offer).length, 1);
    assert.strictEqual(b.sent.filter((m) => m.offer).length, 1);
    assert.strictEqual(c.sent.filter((m) => m.offer).length, 0);
  });

  await t.test('a stopped event and a closed socket leave the swarm', () => {
    const hub = new SignalingHub();
    const a = fakeConn();
    const b = fakeConn();
    hub.handleMessage(a, announce('a'));
    hub.handleMessage(b, announce('b'));
    assert.strictEqual(hub.peerCount(HASH), 2);
    hub.handleMessage(a, announce('a', { event: 'stopped' }));
    assert.strictEqual(hub.peerCount(HASH), 1);
    hub.disconnect(b);
    assert.strictEqual(hub.peerCount(HASH), 0);
    assert.strictEqual(hub.swarmCount, 0);
  });

  await t.test('a reconnected peer replaces its old socket', () => {
    const hub = new SignalingHub();
    const old = fakeConn();
    const fresh = fakeConn();
    const phone = fakeConn();
    hub.handleMessage(old, announce('h'));
    hub.handleMessage(fresh, announce('h'));
    assert.strictEqual(hub.peerCount(HASH), 1);
    hub.disconnect(old); // late close of the old socket must not remove the new entry
    assert.strictEqual(hub.peerCount(HASH), 1);
    hub.handleMessage(phone, announce('p', { offers: [{ offer: { sdp: 'x' }, offer_id: 'o1' }] }));
    assert.strictEqual(fresh.sent.filter((m) => m.offer).length, 1);
    assert.strictEqual(old.sent.filter((m) => m.offer).length, 0);
  });

  await t.test('ignores malformed messages', () => {
    const hub = new SignalingHub();
    const a = fakeConn();
    hub.handleMessage(a, 'not json');
    hub.handleMessage(
      a,
      JSON.stringify({ action: 'announce', info_hash: 'short', peer_id: id('a') }),
    );
    hub.handleMessage(a, JSON.stringify({ action: 'scrape', info_hash: HASH }));
    assert.strictEqual(a.sent.length, 0);
    assert.strictEqual(hub.swarmCount, 0);
  });
});

test('attachSignaling serves the tracker on the HTTP server', async () => {
  const server = http.createServer((_req, res) => res.end('ok'));
  attachSignaling(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const open = (path) =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
      ws.once('open', () => resolve(ws));
      ws.once('error', reject);
    });
  const next = (ws) =>
    new Promise((resolve) => ws.once('message', (data) => resolve(JSON.parse(data.toString()))));

  try {
    await assert.rejects(open('/other'));
    const host = await open(SIGNALING_PATH);
    const phone = await open(`${SIGNALING_PATH}/`);

    const hostAck = next(host);
    host.send(announce('h'));
    assert.strictEqual((await hostAck).incomplete, 1);

    const offered = next(host);
    phone.send(announce('p', { offers: [{ offer: { sdp: 'x' }, offer_id: 'o1' }] }));
    const offer = await offered;
    assert.strictEqual(offer.offer_id, 'o1');
    assert.strictEqual(offer.peer_id, id('p'));

    host.close();
    phone.close();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
