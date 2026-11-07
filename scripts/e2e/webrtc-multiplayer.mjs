#!/usr/bin/env node
/**
 * Multi-browser harness for the one-lobby epic (#647); not part of CI.
 *
 *   npm run e2e:multiplayer            # N=3 browsers
 *   N=5 CHROME=/usr/bin/google-chrome npm run e2e:multiplayer
 *
 * Needs `playwright` (resolved with require, so `NODE_PATH=<dir with node_modules>` works too),
 * a Chrome/Chromium (`CHROME` or Playwright's own), and `cd signaling && npm ci` for the tracker.
 * It starts the tracker (`npm run tracker`, port 8000) and the dev server (`npm run dev`, 5173)
 * unless they already answer, then runs:
 *   1. WebRTC (Melodiq): N-1 phones join, ping/pong keeps them, a reload keeps the slot, a
 *      closed phone leaves the host's roster within 16 s, a dropped network reconnects, a late
 *      phone joins.
 *   2. Lobby -> game -> lobby for every party game, with N-1 guests following the host.
 *   3. Host takeover: the host leaves, a guest takes over within ~20 s, the old host comes back
 *      and steps down (#467 S2).
 *   4. A guest's network goes silent for 30 s (Wi-Fi to mobile data): it must not take over,
 *      and everyone keeps the host (needs `MQTT_RELAY`, which can cut a browser off).
 * Lobby scenarios need an MQTT broker (`lgg/party`, `lgg/room`): the public ones, or a local
 * MQTT-over-WebSocket broker given as `MQTT_RELAY=ws://localhost:1884` — the harness then
 * routes the app's broker WebSockets there (useful offline or in a sandbox). The result is
 * printed per scenario (PASS / FAIL / SKIP) and the exit code is 1 if anything failed.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const N = Number(process.env.N || 3);
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const TRACKER = process.env.TRACKER_URL || 'ws://localhost:8000';
const MQTT_RELAY = process.env.MQTT_RELAY || '';
const GAMES = process.env.GAMES
  ? process.env.GAMES.split(',').filter(Boolean)
  : ['garticphone', 'guessart', 'storyteller', 'knister', 'melodiq-notes', 'melodiq'];
const results = [];
const children = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const record = (name, status, note = '') => {
  results.push({ name, status, note });
  console.log(`${status.padEnd(5)} ${name}${note ? ` - ${note}` : ''}`);
};
const until = async (fn, ms, step = 500) => {
  const end = Date.now() + ms;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* retry */
    }
    if (Date.now() > end) return false;
    await sleep(step);
  }
};
const answers = (url) =>
  fetch(url).then(
    () => true,
    () => false,
  );

async function ensure(name, url, cmd, args, cwd) {
  if (await answers(url)) return;
  const child = spawn(cmd, args, { cwd, stdio: 'ignore', detached: false });
  children.push(child);
  if (!(await until(() => answers(url), 40000))) throw new Error(`${name} did not start`);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('playwright not found: npm i --no-save playwright (or set NODE_PATH)');
    process.exit(2);
  }
  const httpTracker = TRACKER.replace('ws', 'http');
  let trackerUp = true;
  try {
    await ensure('tracker', httpTracker, 'npm', ['run', 'tracker'], process.cwd());
  } catch (e) {
    trackerUp = false;
    console.warn(
      `tracker: ${e.message} (run "cd signaling && npm ci"); WebRTC scenarios are skipped`,
    );
  }
  await ensure('dev server', BASE, 'npm', ['run', 'dev'], process.cwd());

  const browser = await chromium.launch({
    executablePath: process.env.CHROME || undefined,
    args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const open = async (init) => {
    const ctx = await browser.newContext();
    const net = { cut: false };
    if (MQTT_RELAY) await relayMqtt(ctx, net);
    if (init) await ctx.addInitScript(init);
    return { ctx, net, page: await ctx.newPage() };
  };

  try {
    if (process.env.SKIP_WEBRTC) record('webrtc scenarios', 'SKIP', 'SKIP_WEBRTC set');
    else if (trackerUp) await webrtcScenarios(open);
    else record('webrtc scenarios', 'SKIP', 'no tracker');
    for (const game of GAMES) await lobbyScenario(open, game);
    await hostTakeoverScenario(open);
    if (MQTT_RELAY) await silentGuestScenario(open);
    else record('lobby: a silent guest keeps the host', 'SKIP', 'needs MQTT_RELAY');
  } finally {
    await browser.close();
  }
}

/**
 * Pipes the app's public-broker WebSockets to the local broker in `MQTT_RELAY`. While `net.cut`
 * is set, messages are dropped both ways without closing the socket, like a phone whose Wi-Fi
 * went away: the app only notices through its MQTT keepalive.
 */
async function relayMqtt(ctx, net) {
  await ctx.routeWebSocket(/\/\/broker\.(hivemq\.com|emqx\.io)[:/]/, (route) => {
    const upstream = new WebSocket(MQTT_RELAY, 'mqtt');
    upstream.binaryType = 'arraybuffer';
    const pending = [];
    upstream.onopen = () => pending.splice(0).forEach((m) => upstream.send(m));
    upstream.onmessage = (e) => !net.cut && route.send(Buffer.from(e.data));
    upstream.onclose = () => route.close().catch(() => {});
    route.onMessage((m) => {
      if (net.cut) return;
      if (upstream.readyState === 1) upstream.send(m);
      else pending.push(m);
    });
    route.onClose(() => upstream.close());
  });
}

/** The host's party code (`<gameId>_party_id`, stored by `WebRTCHostProvider`). */
const hostPartyId = (page) => page.evaluate(() => localStorage.getItem('melodiq_party_id'));

async function webrtcScenarios(open) {
  const trackers = JSON.stringify([TRACKER]);
  const init = `localStorage.setItem('melodiq_tracker_urls', ${JSON.stringify(trackers)});`;
  const host = await open(init);
  await host.page.goto(`${BASE}/games/melodiq`);
  const party = await until(() => hostPartyId(host.page), 15000);
  if (!party) return record('webrtc: host party id', 'FAIL', 'no party id in storage');
  const phoneUrl = `${BASE}/games/melodiq?role=client&party=${party}&tracker=${encodeURIComponent(TRACKER)}`;
  const connected = (p) => p.evaluate(() => window.__melodiq_rtc_connected === true);

  const phones = [];
  for (let i = 1; i < N; i++) {
    const phone = await open();
    await phone.page.goto(phoneUrl);
    phones.push(phone);
  }
  const allUp = await until(
    async () => (await Promise.all(phones.map((p) => connected(p.page)))).every(Boolean),
    60000,
  );
  record(`webrtc: ${N - 1} phones join`, allUp ? 'PASS' : 'FAIL');
  if (!allUp) return;

  await sleep(12000);
  const still = await Promise.all(phones.map((p) => connected(p.page)));
  record(
    'webrtc: ping/pong keeps phones connected for 12 s',
    still.every(Boolean) ? 'PASS' : 'FAIL',
  );

  await phones[0].page.reload();
  record(
    'webrtc: reload reconnects the same phone',
    (await until(() => connected(phones[0].page), 40000)) ? 'PASS' : 'FAIL',
  );

  const gone = phones.pop();
  await gone.page.close();
  record(
    'webrtc: closed phone observed (host keeps others)',
    (await until(
      async () => (await Promise.all(phones.map((p) => connected(p.page)))).every(Boolean),
      20000,
    ))
      ? 'PASS'
      : 'FAIL',
    'host roster removal <= 16 s is covered by heartbeat.test.ts',
  );

  await phones[0].ctx.setOffline(true);
  await sleep(2000);
  await phones[0].ctx.setOffline(false);
  record(
    'webrtc: phone reconnects after offline',
    (await until(() => connected(phones[0].page), 60000)) ? 'PASS' : 'FAIL',
  );

  const late = await open();
  await late.page.goto(phoneUrl);
  record(
    'webrtc: late phone joins',
    (await until(() => connected(late.page), 60000)) ? 'PASS' : 'FAIL',
  );
  await Promise.all([host, late, ...phones].map((x) => x.ctx.close()));
}

async function lobbyScenario(open, game) {
  const name = `lobby -> ${game}`;
  const host = await open();
  await host.page.goto(`${BASE}/party?launch=${game}`);
  const room = await until(
    () => host.page.evaluate(() => localStorage.getItem('galaxy_host_room_code')),
    15000,
  );
  if (!room) return record(name, 'FAIL', 'host has no room code');
  const guests = [];
  for (let i = 1; i < N; i++) {
    const g = await open();
    await g.page.goto(`${BASE}/party?room=${room}`);
    guests.push(g);
  }
  const joined = await until(async () => {
    const text = await host.page.innerText('body');
    return Number(/(?:Players|Spieler)[^()]*\((\d+)\)/i.exec(text)?.[1] ?? 0) >= N;
  }, 20000);
  if (!joined) {
    await Promise.all([host, ...guests].map((x) => x.ctx.close()));
    return record(name, 'SKIP', `host never saw ${N} players (public MQTT brokers not reachable?)`);
  }
  const start = host.page.getByRole('button', { name: /Jetzt starten|Start now/i });
  if (!(await start.isVisible().catch(() => false))) {
    await Promise.all([host, ...guests].map((x) => x.ctx.close()));
    return record(name, 'SKIP', 'no start button (lobby/MQTT not reachable?)');
  }
  await start.click();
  const everyoneIn = await until(async () => {
    const urls = [host, ...guests].map((x) => x.page.url());
    return urls.every((u) => u.includes('/games/') && (u.includes(room) || u.includes('party=')));
  }, 25000);
  record(`lobby -> ${game}: guests follow the host`, everyoneIn ? 'PASS' : 'FAIL');
  if (everyoneIn) await backToLobby(host, guests, game);
  await Promise.all([host, ...guests].map((x) => x.ctx.close()));
}

/** The host closes its tab: a guest takes over (#467 S2) and can start a game for the rest. */
async function hostTakeoverScenario(open) {
  const name = 'lobby: a guest takes over when the host closes its tab';
  const host = await open();
  await host.page.goto(`${BASE}/party?launch=knister`);
  const room = await until(
    () => host.page.evaluate(() => localStorage.getItem('galaxy_host_room_code')),
    15000,
  );
  const guests = [];
  for (let i = 1; i < Math.max(N, 3); i++) {
    const g = await open();
    await g.page.goto(`${BASE}/party?room=${room}`);
    guests.push(g);
  }
  const hostOf = (x) =>
    x.page.evaluate((r) => {
      const state = JSON.parse(localStorage.getItem(`galaxy_party_state_${r}`) || '{}');
      return { hostId: state.hostId, me: sessionStorage.getItem('party_my_player_id') };
    }, room);
  await until(async () => (await hostOf(guests[0])).hostId, 15000);
  await sleep(4000); // everyone has pinged at least once
  // Leave the page (like a closed tab) but keep the tab's session, so it can come back.
  await host.page.goto('about:blank');
  const t0 = Date.now();
  const taken = await until(async () => {
    const views = await Promise.all(guests.map(hostOf));
    const newHost = views[0].hostId;
    return (
      views.every((v) => v.hostId === newHost) && views.some((v) => v.me === newHost) && newHost
    );
  }, 45000);
  const secs = Math.round((Date.now() - t0) / 1000);
  record(name, taken ? 'PASS' : 'FAIL', taken ? `after ${secs} s` : 'no new host');
  if (taken) {
    // The old host comes back to the room: it must accept the new host, not split the room.
    await host.page.goto(`${BASE}/party?room=${room}`);
    const settled = await until(async () => {
      const views = await Promise.all([host, ...guests].map(hostOf));
      return views.every((v) => v.hostId === taken);
    }, 20000);
    await sleep(8000); // a few more pings: the old host must not take the room back
    const views = await Promise.all([host, ...guests].map(hostOf));
    const stable = settled && views.every((v) => v.hostId === taken);
    record(
      'lobby: the old host comes back and steps down',
      stable ? 'PASS' : 'FAIL',
      stable ? '' : JSON.stringify(views),
    );
  }
  await Promise.all([host, ...guests].map((x) => x.ctx.close().catch(() => {})));
}

/** A guest hears nothing for 30 s and comes back: it must not have made itself host. */
async function silentGuestScenario(open) {
  const name = 'lobby: a silent guest keeps the host';
  const host = await open();
  await host.page.goto(`${BASE}/party?launch=garticphone`);
  const room = await until(
    () => host.page.evaluate(() => localStorage.getItem('galaxy_host_room_code')),
    15000,
  );
  const guests = [];
  for (let i = 1; i < Math.max(N, 3); i++) {
    const g = await open();
    await g.page.goto(`${BASE}/party?room=${room}`);
    guests.push(g);
  }
  const all = [host, ...guests];
  const view = (x) =>
    x.page.evaluate((r) => {
      const state = JSON.parse(localStorage.getItem(`galaxy_party_state_${r}`) || '{}');
      const me = sessionStorage.getItem('party_my_player_id');
      return {
        hostId: state.hostId,
        me,
        claims: Boolean(sessionStorage.getItem(`party_host_id_${r}`)),
      };
    }, room);
  const hostId = await until(async () => (await view(host)).me, 15000);
  await until(
    async () => (await Promise.all(guests.map(view))).every((v) => v.hostId === hostId),
    15000,
  );
  await sleep(4000);
  const lowest = guests[0]; // the first guest has the lowest seat: it would take over
  lowest.net.cut = true;
  await sleep(30000);
  lowest.net.cut = false;
  await sleep(10000);
  const views = await Promise.all(all.map(view));
  const ok = views.every((v) => v.hostId === hostId) && !views[1].claims && views[0].claims;
  record(name, ok ? 'PASS' : 'FAIL', ok ? '' : JSON.stringify(views));
  await Promise.all(all.map((x) => x.ctx.close().catch(() => {})));
}

/** The host ends the game with its "back to lobby" control; every guest must follow. */
async function backToLobby(host, guests, game) {
  const name = `${game} -> lobby: guests follow the host back`;
  const back = host.page
    .getByRole('button', { name: /^(?!.*(share|teilen)).*(zur party|back to (the )?party|lobby)/i })
    .first();
  let found = await until(() => back.isVisible().catch(() => false), 8000);
  if (!found) {
    // Melodiq Notes keeps it in the players panel behind "Invite players".
    const invite = host.page.getByRole('button', { name: /Mitspieler einladen|Invite players/i });
    if (
      await invite
        .first()
        .isVisible()
        .catch(() => false)
    )
      await invite.first().click();
    found = await until(() => back.isVisible().catch(() => false), 5000);
  }
  if (!found) {
    const names = await host.page
      .getByRole('button')
      .evaluateAll((els) =>
        els.map((e) => e.getAttribute('aria-label') || e.textContent).slice(0, 25),
      );
    return record(name, 'SKIP', `no "back to lobby" control for the host (${names.join(' | ')})`);
  }
  const label =
    (await back.textContent().catch(() => '')) || (await back.getAttribute('aria-label'));
  await back.click();
  const back2 = await until(
    () => [host, ...guests].every((x) => new URL(x.page.url()).pathname === '/party'),
    20000,
  );
  const status = (x) =>
    x.page.evaluate(() =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith('galaxy_party_state_'))
        .map((k) => {
          const st = JSON.parse(localStorage.getItem(k) || '{}');
          const me = sessionStorage.getItem('party_my_player_id');
          return `${st.status} host=${st.hostId === me ? 'me' : st.hostId} epoch=${st.hostEpoch ?? 0}`;
        })
        .join(','),
    );
  const detail = back2
    ? ''
    : `host ${host.page.url()} [${await status(host)}]; guests ${(
        await Promise.all(guests.map(async (g) => `${g.page.url()} [${await status(g)}]`))
      ).join(' ')}`;
  record(name, back2 ? 'PASS' : 'FAIL', back2 ? '' : `clicked "${label}"; ${detail}`);
}

main()
  .catch((e) => {
    console.error(e);
    results.push({ name: 'harness', status: 'FAIL', note: String(e.message) });
  })
  .finally(() => {
    children.forEach((c) => c.kill());
    const failed = results.filter((r) => r.status === 'FAIL').length;
    console.log(`\n${results.length} scenario(s), ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
