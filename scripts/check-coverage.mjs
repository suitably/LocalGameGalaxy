#!/usr/bin/env node
/**
 * Line-coverage ratchet for the logic/ folders under src/ (#850). Reads
 * coverage/coverage-summary.json written by `npm run test:coverage`; it does not run tests itself.
 *
 *   node scripts/check-coverage.mjs           # fail if a listed file drops > 2 points, or a new
 *                                             # logic/ file with >= 30 lines has < 60 % line coverage
 *   node scripts/check-coverage.mjs --update  # rewrite scripts/coverage-baselines.json from the summary
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX_DROP,
  NEW_FILE_MIN_LINES,
  NEW_FILE_MIN_PCT,
  buildBaseline,
  compareCoverage,
  logicCoverage,
} from './lib/coverage-ratchet.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUMMARY_FILE = path.join(ROOT_DIR, 'coverage', 'coverage-summary.json');
const BASELINE_FILE = path.join(ROOT_DIR, 'scripts', 'coverage-baselines.json');

if (!fs.existsSync(SUMMARY_FILE)) {
  console.error(
    '❌ [Coverage] coverage/coverage-summary.json not found. Run `npm run test:coverage` first.',
  );
  process.exit(1);
}

const current = logicCoverage(JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8')), ROOT_DIR);

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(buildBaseline(current), null, 2)}\n`);
  console.log(
    `✔ Wrote ${Object.keys(current).length} file baselines to scripts/coverage-baselines.json`,
  );
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE_FILE)
  ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
  : {};
const { dropped, weakNew, missing } = compareCoverage(current, baseline);

if (dropped.length > 0 || weakNew.length > 0) {
  console.error('\n❌ [Coverage] logic/ line coverage ratchet failed:');
  for (const { file, baseline: was, current: now } of dropped) {
    console.error(`   ⛔ ${file}: ${now} % lines, baseline ${was} % (max drop ${MAX_DROP} points)`);
  }
  for (const { file, lines, current: now } of weakNew) {
    console.error(
      `   ⛔ ${file}: new file, ${lines} lines, ${now} % covered (need ${NEW_FILE_MIN_PCT} % from ${NEW_FILE_MIN_LINES} lines)`,
    );
  }
  console.error(
    '\n💡 Add Vitest tests next to the logic file. After a deliberate change run `npm run check:coverage -- --update`.\n',
  );
  process.exit(1);
}

if (missing.length > 0) {
  console.warn(
    `⚠ ${missing.length} baseline file(s) no longer exist; run \`npm run check:coverage -- --update\` to drop them.`,
  );
}
console.log(
  `✔ Coverage ratchet passed: ${Object.keys(current).length} logic/ file(s), none dropped more than ${MAX_DROP} points.`,
);
