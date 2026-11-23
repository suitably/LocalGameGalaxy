#!/usr/bin/env node
/**
 * Dead-code ratchet (knip, #841). Config: knip.json. Runs `knip --reporter json`.
 *
 *   node scripts/check-deadcode.mjs           # fail if any "<category>:<file>" count exceeds its baseline
 *   node scripts/check-deadcode.mjs --update  # lower baselines in scripts/deadcode-baselines.json (never raises)
 *   node scripts/check-deadcode.mjs --init    # write the baseline from the current state
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  countIssues,
  compareToBaseline,
  lowerBaseline,
  sortCounts,
  totalsByCategory,
} from './lib/deadcode-ratchet.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_FILE = path.join(ROOT_DIR, 'scripts', 'deadcode-baselines.json');
const mode = process.argv.includes('--init')
  ? 'init'
  : process.argv.includes('--update')
    ? 'update'
    : 'check';

const writeBaseline = (counts) =>
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(sortCounts(counts), null, 2)}\n`);

// knip exits 1 when it finds issues; only a missing/invalid JSON report is a real failure.
// KNIP_BIN lets a caller without a knip install run `npx --yes knip@<version>` instead.
const [bin, ...binArgs] = (process.env.KNIP_BIN || 'knip').split(' ');
const run = spawnSync(bin, [...binArgs, '--reporter', 'json'], {
  cwd: ROOT_DIR,
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
  shell: process.platform === 'win32',
});
let report;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error('❌ [Dead code] knip did not produce a JSON report:');
  console.error(
    (run.stderr || run.stdout || String(run.error)).split('\n').slice(0, 20).join('\n'),
  );
  process.exit(1);
}
const current = countIssues(report);

if (mode === 'init') {
  writeBaseline(current);
  console.log(
    `✔ Wrote ${Object.keys(current).length} baselines to scripts/deadcode-baselines.json`,
  );
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE_FILE)
  ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
  : {};
const { increased, stale } = compareToBaseline(current, baseline);

if (increased.length > 0) {
  console.error('\n❌ [Dead code] knip issues increased:');
  for (const { key, baseline: allowed, current: count } of increased) {
    console.error(`   ⛔ ${key}: ${count} issue(s), allowed ${allowed}`);
  }
  console.error(
    '\n💡 Remove the unused export/file/dependency (run `npx knip` for details), or drop the `export` keyword. Baselines are never raised.\n',
  );
  process.exit(1);
}

if (mode === 'update') {
  writeBaseline(lowerBaseline(current, baseline));
  console.log(`✔ Lowered ${stale.length} baseline(s) in scripts/deadcode-baselines.json`);
  process.exit(0);
}

const totals = Object.entries(totalsByCategory(current))
  .map(([category, n]) => `${category} ${n}`)
  .join(', ');
if (stale.length > 0) {
  console.warn(
    `⚠ ${stale.length} baseline(s) are higher than the current count; run \`npm run check:deadcode -- --update\` to lock in the progress.`,
  );
}
console.log(`✔ Dead-code ratchet passed (${totals || 'no issues'}).`);
