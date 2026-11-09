#!/usr/bin/env node
/**
 * Spieltisch frame-time measurement with 800 widgets (#684, TTS plan D5); not part of CI.
 *
 *   npm run build && npm run perf:tabletop            # serves dist/ with `vite preview`
 *   BASE_URL=http://localhost:4173 npm run perf:tabletop
 *   CPU_THROTTLE=6 RUNS=5 INPUT=mouse npm run perf:tabletop
 *
 * Needs `playwright` and a Chromium (`CHROME`, else Playwright's own). The script serves a
 * generated table (`perf-800`: 500 cards, 250 tokens, 30 decks, 20 holders, all visible after
 * fit-to-screen, so culling hides nothing) instead of `public/games/tabletop/perf-800.json`, opens
 * it in local pass-and-play, throttles the CPU (`CPU_THROTTLE`, default 4 ≈ a mid-range phone,
 * like Lighthouse's mobile preset), drives it with touch input (`INPUT=mouse` for a mouse; a
 * mouse hit-tests the whole table on every move, a captured touch pointer does not), and records
 * requestAnimationFrame intervals while
 *   1. a token is dragged across the table (120 pointer moves), and
 *   2. the table is panned (120 pointer moves).
 * It prints p50 / p95 / max frame time per scenario as JSON and exits 1 when a p95 is above
 * `BUDGET_MS` (default 16.7). D5: a Canvas renderer is considered only if p95 stays above 16 ms.
 * Measure on the production build: React's development build is several times slower.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const CPU_THROTTLE = Number(process.env.CPU_THROTTLE || 4);
const RUNS = Number(process.env.RUNS || 3);
const BUDGET_MS = Number(process.env.BUDGET_MS || 16.7);
const INPUT = process.env.INPUT === 'mouse' ? 'mouse' : 'touch';
const GAME_ID = 'perf-800';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 800 widgets on a 4000 × 2500 table. */
export function buildPerfGame() {
  const widgets = {};
  const add = (w) => (widgets[w.id] = { zIndex: 10, ...w });
  for (let i = 0; i < 20; i++) {
    add({
      id: `h_${i}`,
      type: 'holder',
      x: 60 + (i % 10) * 390,
      y: i < 10 ? 40 : 2200,
      width: 300,
      height: 220,
      zIndex: 1,
      label: `Zone ${i}`,
      childIds: [],
      dropTarget: true,
    });
  }
  const decks = [];
  for (let i = 0; i < 30; i++) {
    const deck = {
      id: `d_${i}`,
      type: 'deck',
      x: 80 + (i % 15) * 255,
      y: i < 15 ? 330 : 1950,
      width: 90,
      height: 135,
      label: `Deck ${i}`,
      cardIds: [],
    };
    decks.push(add(deck));
  }
  for (let i = 0; i < 500; i++) {
    const inDeck = i < 150; // 5 cards per deck stay in a deck (exercise the membership sets)
    const card = add({
      id: `c_${i}`,
      type: 'card',
      x: 120 + (i % 40) * 95,
      y: 520 + Math.floor(i / 40) * 105,
      width: 80,
      height: 120,
      label: `Card ${i}`,
      faceUp: i % 2 === 0,
      rotation: 0,
      frontContent: { type: 'text', value: `♠ ${i % 13}`, color: '#1a1a1a' },
      backContent: { type: 'text', value: '🂠', color: '#0d47a1' },
    });
    if (inDeck) {
      const deck = decks[i % 30];
      deck.cardIds.push(card.id);
      card.deckId = deck.id;
      card.x = deck.x;
      card.y = deck.y;
    }
  }
  for (let i = 0; i < 250; i++) {
    add({
      id: `t_${i}`,
      type: 'token',
      x: 100 + (i % 50) * 76,
      y: 1500 + Math.floor(i / 50) * 80,
      width: 60,
      height: 60,
      shape: 'circle',
      color: '#d32f2f',
      label: `${i}`,
    });
  }
  return {
    id: GAME_ID,
    name: 'Performance 800',
    version: '1.0.0',
    minPlayers: 1,
    maxPlayers: 4,
    supportedModes: ['local_pass_and_play'],
    table: { width: 4000, height: 2500, backgroundColor: '#1e3d2f' },
    widgets,
  };
}

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
const summarize = (frames) => {
  const s = [...frames].sort((a, b) => a - b);
  const r = (n) => Math.round(n * 10) / 10;
  return {
    frames: s.length,
    p50: r(percentile(s, 50)),
    p95: r(percentile(s, 95)),
    max: r(s.at(-1)),
    over16: s.filter((f) => f > 16.7).length,
  };
};

async function answers(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await answers(BASE)) return null;
  const port = new URL(BASE).port || '4173';
  // Vite itself, not `npx`: killing `npx` would leave the preview server running.
  const vite = new URL('../../node_modules/vite/bin/vite.js', import.meta.url).pathname;
  const child = spawn(process.execPath, [vite, 'preview', '--port', port, '--strictPort'], {
    stdio: 'ignore',
  });
  for (let i = 0; i < 60 && !(await answers(BASE)); i++) await sleep(500);
  if (!(await answers(BASE))) throw new Error(`no server at ${BASE} (run npm run build first)`);
  return child;
}

/** Board position of a widget from the reducer's state, read from its inline style. */
const widgetPosition = (page, id) =>
  page.evaluate((wid) => {
    const el = document.querySelector(`[data-widget-id="${wid}"] > *`);
    return el ? { x: parseFloat(el.style.left), y: parseFloat(el.style.top) } : null;
  }, id);

async function recordFrames(page, gesture) {
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (t) => {
      window.__frames.push(t - last);
      last = t;
      if (window.__recording) requestAnimationFrame(tick);
    };
    window.__recording = true;
    requestAnimationFrame(tick);
  });
  await gesture();
  return page.evaluate(() => {
    window.__recording = false;
    return window.__frames.slice(1);
  });
}

/** Pointer input as a phone (touch, via CDP) or a desktop (mouse) sends it. */
const pointer = (page, cdp) =>
  INPUT === 'mouse'
    ? {
        down: async (x, y) => {
          await page.mouse.move(x, y);
          await page.mouse.down();
        },
        move: (x, y) => page.mouse.move(x, y),
        up: () => page.mouse.up(),
      }
    : {
        down: (x, y) =>
          cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }),
        move: (x, y) =>
          cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }),
        up: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
      };

/** 120 pointer moves, one per frame budget, from (x, y) by (dx, dy). */
async function drag(input, x, y, dx, dy) {
  await input.down(x, y);
  for (let i = 1; i <= 120; i++) {
    await input.move(x + (dx * i) / 120, y + (dy * i) / 120);
    await sleep(16);
  }
  await input.up();
  await sleep(200);
}

async function main() {
  const { chromium } = require('playwright');
  const server = await ensureServer();
  const browser = await chromium.launch(
    process.env.CHROME ? { executablePath: process.env.CHROME } : {},
  );
  const results = {
    cpuThrottle: CPU_THROTTLE,
    input: INPUT,
    runs: RUNS,
    widgets: 800,
    drag: [],
    pan: [],
  };
  try {
    const game = JSON.stringify(buildPerfGame());
    for (let run = 0; run < RUNS; run++) {
      // A fresh context per run: the autosave would otherwise resume the previous run's table.
      const context = await browser.newContext({
        viewport: { width: 915, height: 412 },
        deviceScaleFactor: 1,
        hasTouch: INPUT === 'touch',
      });
      await context.route(`**/games/tabletop/${GAME_ID}.json`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: game }),
      );
      const page = await context.newPage();
      await page.goto(`${BASE}/games/tabletop?local=1&gameId=${GAME_ID}`, {
        waitUntil: 'networkidle',
      });
      await page.waitForSelector('[data-widget-id="t_0"]', { timeout: 30000 });
      await page.keyboard.press('Escape'); // close a pass-and-play / onboarding dialog if one is open
      await sleep(500);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
      const counted = await page.evaluate(
        () => document.querySelectorAll('[data-widget-id]').length,
      );
      const box = await page.locator('[data-widget-id="t_0"] > *').first().boundingBox();
      if (!box) throw new Error('token t_0 not on screen');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      if (process.env.SCREENSHOT)
        await page.screenshot({ path: `${process.env.SCREENSHOT}-${run}.png` });
      const before = await widgetPosition(page, 't_0');
      const input = pointer(page, cdp);
      results.drag.push(summarize(await recordFrames(page, () => drag(input, cx, cy, 300, -120))));
      const after = await widgetPosition(page, 't_0');
      if (!after || Math.abs(after.x - before.x) < 50)
        throw new Error(`token did not move: ${JSON.stringify({ before, after })}`);
      // A context menu opening mid-drag (the touch long press before #684) skews the frames.
      if (await page.locator('.MuiMenu-root').count())
        results.menuDuringDrag = (results.menuDuringDrag ?? 0) + 1;
      results.pan.push(summarize(await recordFrames(page, () => drag(input, 900, 40, -300, 150))));
      results.renderedWidgets = counted;
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await context.close();
    }
  } finally {
    await browser.close();
    server?.kill();
  }
  const worst = (k) => Math.max(...results[k].map((r) => r.p95));
  results.p95 = { drag: worst('drag'), pan: worst('pan') };
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.p95.drag > BUDGET_MS || results.p95.pan > BUDGET_MS ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
