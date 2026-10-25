#!/usr/bin/env node
/**
 * Measures interactive elements below the touch-target minimum (DESIGN.md §4, issue #510).
 *
 * Usage: node scripts/measure-touch-targets.cjs [--base http://localhost:5173] [--min 48]
 *        [--width 360] [--height 800] [--routes /,/settings,/games/qwixx] [--json out.json]
 * Needs a running dev server (`npm run dev`) and the `playwright` package with chromium.
 * Hit area = bounding box, expanded by an absolutely positioned ::before/::after overlay
 * (the invisible hit-area technique), so enlarged-by-pseudo-element targets pass.
 * Exit code 1 when violations exist (informational; not part of the CI gates).
 */
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const base = opt('base', 'http://localhost:5173').replace(/\/$/, '');
const min = Number(opt('min', '48'));
const width = Number(opt('width', '360'));
const height = Number(opt('height', '800'));
const jsonOut = opt('json', '');
const DEFAULT_ROUTES = [
  '/',
  '/settings',
  '/games/darts',
  '/games/qwixx',
  '/games/knister',
  '/games/kniffel',
  '/games/guessart',
  '/games/storyteller',
  '/games/cards',
  '/games/melodiq',
  '/games/melodiq-notes',
  '/games/werewolf',
  '/games/imposter',
  '/games/party',
  '/games/wordle',
  '/games/sudoku',
  '/games/tabletop',
  '/games/garticphone',
];
const routes = opt('routes', '') ? opt('routes', '').split(',') : DEFAULT_ROUTES;

const SELECTOR =
  'button, [role=button], a[href], input:not([type=hidden]):not([type=range]), .MuiSlider-root, select, [role=checkbox], [role=switch], [role=tab], [role=menuitem], [role=radio]';

function collect([minSize, SELECTOR]) {
  const describe = (el) => {
    const label = (el.getAttribute('aria-label') || el.textContent || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 30);
    const cls =
      typeof el.className === 'string'
        ? el.className
            .split(/\s+/)
            .filter((c) => /^Mui[A-Za-z]+-(root|size)/.test(c))
            .slice(0, 2)
            .join('.')
        : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${label}"`;
  };
  const out = [];
  for (const el of document.querySelectorAll(SELECTOR)) {
    const style = getComputedStyle(el);
    let r = el.getBoundingClientRect();
    // Visually hidden inputs (checkbox/radio): measure the wrapping control instead.
    if (el.matches('input') && Number(style.opacity) === 0 && el.parentElement) {
      r = el.parentElement.getBoundingClientRect();
    }
    if (r.width === 0 || r.height === 0) continue;
    if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none')
      continue;
    if (el.closest('[aria-hidden=true], [hidden]')) continue;
    // Inline links inside running text are exempt (WCAG 2.5.8 inline exception).
    if (el.matches('a') && style.display === 'inline') continue;
    let w = r.width;
    let h = r.height;
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content !== 'none' && ps.position === 'absolute') {
        w = Math.max(w, parseFloat(ps.width) || 0);
        h = Math.max(h, parseFloat(ps.height) || 0);
      }
    }
    if (w + 0.5 < minSize || h + 0.5 < minSize) {
      out.push({
        el: describe(el),
        w: Math.round(w),
        h: Math.round(h),
        x: Math.round(r.x),
        y: Math.round(r.y),
      });
    }
  }
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: true,
    isMobile: true,
  });
  const report = {};
  let total = 0;
  for (const route of routes) {
    const page = await context.newPage();
    try {
      await page.goto(base + route, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(800);
      const bad = await page.evaluate(collect, [min, SELECTOR]);
      report[route] = bad;
      total += bad.length;
      console.log(`\n${route}: ${bad.length} below ${min}px`);
      for (const b of bad) console.log(`  ${b.w}x${b.h} @${b.x},${b.y}  ${b.el}`);
    } catch (e) {
      report[route] = { error: String(e.message || e) };
      console.log(`\n${route}: ERROR ${String(e.message || e).split('\n')[0]}`);
    }
    await page.close();
  }
  await browser.close();
  console.log(`\nTotal violations: ${total} (viewport ${width}x${height}, min ${min}px)`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  process.exit(total ? 1 : 0);
})();
