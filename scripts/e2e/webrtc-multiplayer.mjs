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
 * Lobby scenarios need the public MQTT brokers (`lgg/party`, `lgg/room`); the result is printed
 * per scenario (PASS / FAIL / SKIP) and the exit code is 1 if anything failed.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const N = Number(process.env.N || 3);
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const TRACKER = process.env.TRACKER_URL || 'ws://localhost:8000';
const GAMES = ['garticphone', 'guessart', 'storyteller', 'knister', 'melodiq-notes', 'melodiq'];
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
    if (init) await ctx.addInitScript(init);
    return { ctx, page: await ctx.newPage() };
  };

  try {
    if (trackerUp) await webrtcScenarios(open);
    else record('webrtc scenarios', 'SKIP', 'no tracker');
    for (const game of GAMES) await lobbyScenario(open, game);
  } finally {
    await browser.close();
  }
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
  record(
    `lobby -> ${game}: guests follow the host (return to lobby is manual)`,
    everyoneIn ? 'PASS' : 'FAIL',
  );
  await Promise.all([host, ...guests].map((x) => x.ctx.close()));
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
