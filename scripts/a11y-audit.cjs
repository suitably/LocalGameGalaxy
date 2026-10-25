#!/usr/bin/env node
/**
 * Runs axe-core (WCAG 2.0/2.1 A + AA) over hub, settings and each game's start screen (issue #512).
 *
 * Usage: node scripts/a11y-audit.cjs [--base http://localhost:5173] [--routes /,/settings]
 *        [--theme dark|light] [--json out.json]
 * Needs a running dev server (`npm run dev`) and the `playwright` package with chromium
 * (NODE_PATH=/opt/node-tools/node_modules if it is not resolvable).
 * axe source: `axe-core` / `@axe-core/playwright` from node_modules when present, else the file in
 * AXE_PATH, else the jsDelivr CDN. Exit code 1 when violations exist (informational, not a CI gate).
 */
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const base = opt('base', 'http://localhost:5173').replace(/\/$/, '');
const theme = opt('theme', 'dark');
const jsonOut = opt('json', '');
const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';
const DEFAULT_ROUTES = [
  '/',
  '/settings',
  ...[
    'darts',
    'qwixx',
    'knister',
    'kniffel',
    'guessart',
    'storyteller',
    'cards',
    'melodiq',
    'melodiq-notes',
    'werewolf',
    'imposter',
    'party',
    'wordle',
    'sudoku',
    'tabletop',
    'garticphone',
  ].map((g) => `/games/${g}`),
];
const routes = opt('routes', '') ? opt('routes', '').split(',') : DEFAULT_ROUTES;

function localAxePath() {
  const candidates = [process.env.AXE_PATH, 'axe-core/axe.min.js'];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return require.resolve(c);
    } catch {
      if (fs.existsSync(c)) return c;
    }
  }
  return null;
}

(async () => {
  const axePath = localAxePath();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((t) => {
    try {
      localStorage.setItem('themeMode', t);
    } catch {
      /* ignore */
    }
  }, theme);
  const page = await context.newPage();
  const summary = [];
  let total = 0;
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    await page.addScriptTag(axePath ? { path: axePath } : { url: AXE_CDN });
    const result = await page.evaluate(() =>
      window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      }),
    );
    for (const v of result.violations) {
      for (const n of v.nodes) {
        n.hint = await page
          .evaluate(
            (sel) => {
              const el = document.querySelector(sel);
              if (!el) return '';
              const icon = el.querySelector('svg[data-testid]');
              const up = el.parentElement && el.parentElement.parentElement;
              return `${icon ? icon.getAttribute('data-testid') : ''} | ctx: ${((up && up.textContent) || '').trim().slice(0, 50)}`;
            },
            n.target[n.target.length - 1],
          )
          .catch(() => '');
      }
    }
    const nodes = result.violations.reduce((n, v) => n + v.nodes.length, 0);
    total += nodes;
    summary.push({
      route,
      nodes,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        count: v.nodes.length,
        samples: v.nodes.slice(0, 3).map((n) => ({
          target: n.target.join(' '),
          html: n.html.slice(0, 400),
          summary: n.failureSummary.split('\n').slice(1, 2).join('').trim(),
        })),
      })),
    });
    console.log(`${route}: ${nodes} violating nodes`);
    for (const v of result.violations) {
      for (const n of v.nodes)
        console.log(
          `  [${v.impact}] ${v.id}: ${n.html
            .slice(0, 120)
            .replace(/class="[^"]*"/g, '')
            .replace(/\s+/g, ' ')} ${n.hint}`,
        );
    }
  }
  console.log(`TOTAL violating nodes: ${total}`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
  await browser.close();
  process.exit(total > 0 ? 1 : 0);
})();
