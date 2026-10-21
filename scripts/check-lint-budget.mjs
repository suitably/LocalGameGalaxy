#!/usr/bin/env node
/**
 * ESLint warning ratchet (per file). Errors are handled by `npm run lint`.
 *
 *   node scripts/check-lint-budget.mjs           # fail if any file has more warnings than its baseline,
 *                                                # or if a baseline is higher than the current count
 *   node scripts/check-lint-budget.mjs --update  # lower stale baselines (never raises them)
 *   node scripts/check-lint-budget.mjs --init    # write the baseline from the current state
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { countWarnings, compareToBaseline, lowerBaseline, sortCounts } from './lib/lint-budget.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_FILE = path.join(ROOT_DIR, 'scripts', 'lint-warning-baselines.json');
const mode = process.argv.includes('--init')
  ? 'init'
  : process.argv.includes('--update')
    ? 'update'
    : 'check';

const writeBaseline = (counts) =>
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(sortCounts(counts), null, 2)}\n`);

const eslint = new ESLint({ cwd: ROOT_DIR });
const current = countWarnings(await eslint.lintFiles(['.']), ROOT_DIR);

if (mode === 'init') {
  writeBaseline(current);
  console.log(
    `✔ Wrote ${Object.keys(current).length} file baselines to scripts/lint-warning-baselines.json`,
  );
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE_FILE)
  ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
  : {};
const { increased, stale } = compareToBaseline(current, baseline);

if (increased.length > 0) {
  console.error('\n❌ [Lint Budget] ESLint warnings increased:');
  for (const { file, baseline: allowed, current: count } of increased) {
    console.error(`   ⛔ ${file}: ${count} warning(s), allowed ${allowed}`);
  }
  console.error('\n💡 Fix the new warnings (`npx eslint <file>`). Baselines are never raised.\n');
  process.exit(1);
}

if (mode === 'update') {
  writeBaseline(lowerBaseline(current, baseline));
  console.log(`✔ Lowered ${stale.length} baseline(s) in scripts/lint-warning-baselines.json`);
  process.exit(0);
}

if (stale.length > 0) {
  console.error('\n❌ [Lint Budget] Warnings were fixed — lock in the progress:');
  for (const { file, baseline: allowed, current: count } of stale) {
    console.error(`   ✨ ${file}: ${count} warning(s), baseline ${allowed}`);
  }
  console.error(
    '\n💡 Run `npm run check:lint-budget -- --update` and commit scripts/lint-warning-baselines.json.\n',
  );
  process.exit(1);
}

const total = Object.values(current).reduce((sum, n) => sum + n, 0);
console.log(
  `✔ Lint budget passed: ${total} warning(s) in ${Object.keys(current).length} file(s), none above baseline.`,
);
