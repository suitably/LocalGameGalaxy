#!/usr/bin/env node
/**
 * Doc-Sync Guardrail for LocalGameGalaxy
 *
 * Enforces that whenever core gameplay logic or shared modules are modified,
 * the technical documentation in docs/tech/, AGENTS.md, or translations must also be kept up to date.
 *
 * Runs in CI during PR checks.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { getChangedFiles } from './lib/changed-files.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

function getCodeDiffStats(diffTarget, files, cwd) {
  if (!diffTarget || files.length === 0) return { added: 0, deleted: 0, total: 0 };
  try {
    const output = execFileSync(
      'git',
      ['diff', '--numstat', `${diffTarget}...HEAD`, '--', ...files],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    let added = 0;
    let deleted = 0;
    for (const line of output.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const a = parseInt(parts[0], 10);
        const d = parseInt(parts[1], 10);
        if (!isNaN(a)) added += a;
        if (!isNaN(d)) deleted += d;
      }
    }
    return { added, deleted, total: added + deleted };
  } catch {
    return { added: 0, deleted: 0, total: 0 };
  }
}

let diffResult;
try {
  diffResult = getChangedFiles({ cwd: ROOT_DIR });
} catch (err) {
  if (isCI) {
    console.error(`\n❌ [Doc-Sync Gate] Failed to compute git diff in CI: ${err.message}`);
    process.exit(1);
  }
  console.warn(`⚠️ Could not determine git diff: ${err.message}. Skipping doc-sync check.`);
  process.exit(0);
}

const changedFiles = diffResult.files;

if (changedFiles.length === 0) {
  console.log('✔ No files changed. Doc-sync gate passed.');
  process.exit(0);
}

const baseLabel = diffResult.mergeBase
  ? `${diffResult.baseRef} (merge-base ${diffResult.mergeBase.slice(0, 7)})`
  : diffResult.baseRef;

console.log(
  `\n📋 [Doc-Sync Gate] Checking ${changedFiles.length} changed file(s) against ${baseLabel}...`,
);

const prBody = process.env.PR_BODY || '';
const prTitle = process.env.PR_TITLE || '';
// comma-separated PR label names (ci.yml passes them)
const prLabels = (process.env.PR_LABELS || '')
  .split(',')
  .map((l) => l.trim())
  .filter(Boolean);

// 1. Check for skip marker in PR_BODY or PR_TITLE
if (
  prBody.includes('[skip docs]') ||
  prBody.includes('[skip changelog]') ||
  prTitle.includes('[skip docs]') ||
  prTitle.includes('[skip changelog]')
) {
  console.log('✔ Doc-sync gate bypassed by [skip docs] marker.\n');
  process.exit(0);
}

if (prLabels.includes('no-changelog')) {
  console.log("✔ Doc-sync gate bypassed by the 'no-changelog' label.\n");
  process.exit(0);
}

// 2. Bypass for chore/refactor/style/test/docs/perf PRs
if (/^(chore|refactor|style|test|docs|perf)(\([a-z0-9_-]+\))?:/i.test(prTitle)) {
  console.log(`✔ Doc-sync gate bypassed for PR type '${prTitle.split(':')[0]}'.\n`);
  process.exit(0);
}

// Check if core code was modified
const matchedCodeFiles = changedFiles.filter(
  (f) =>
    (f.startsWith('src/games/') || f.startsWith('src/modules/') || f.startsWith('src/lib/')) &&
    (f.endsWith('.ts') || f.endsWith('.tsx')) &&
    !f.includes('.test.') &&
    !f.includes('.spec.'),
);

// Check if documentation, changelog, or translations were touched.
// A changelog fragment (changelog.d/<slug>.<type>.md, #593) counts like a CHANGELOG.md edit.
const isChangelogFragment = (f) =>
  /^changelog\.d\/[^/]+\.md$/.test(f) && f !== 'changelog.d/README.md';
const matchedDocFiles = changedFiles.filter(
  (f) =>
    f === 'CHANGELOG.md' ||
    isChangelogFragment(f) ||
    f.startsWith('docs/tech/') ||
    f === 'AGENTS.md' ||
    f === 'README.md' ||
    f.startsWith('public/locales/'),
);

if (matchedCodeFiles.length > 0 && matchedDocFiles.length === 0) {
  const diffTarget =
    diffResult.mergeBase || (diffResult.baseRef !== 'HEAD' ? diffResult.baseRef : null);
  const diffStats = getCodeDiffStats(diffTarget, matchedCodeFiles, ROOT_DIR);

  // 3. Heuristic: Small bugfix (fix: prefix and <= 50 lines changed across <= 3 core files)
  const isFix = /^fix(\([a-z0-9_-]+\))?:/i.test(prTitle);
  if (isFix && diffStats.total <= 50 && matchedCodeFiles.length <= 3) {
    console.log(
      `✔ Doc-sync gate passed: Minor bugfix detected (${diffStats.total} lines changed across ${matchedCodeFiles.length} file(s), PR type 'fix'). Mandatory doc sync waived.\n`,
    );
    process.exit(0);
  }

  console.error('\n❌ [Doc-Sync & Changelog Gate Violation]');
  console.error(
    `Core source code was modified (${matchedCodeFiles.length} file(s), ${diffStats.total} lines), but no documentation or translations were updated!`,
  );
  console.error('Modified code files:');
  for (const f of matchedCodeFiles.slice(0, 10)) {
    console.error(`  - ${f}`);
  }
  if (matchedCodeFiles.length > 10) {
    console.error(`  ... and ${matchedCodeFiles.length - 10} more`);
  }
  console.error(
    '\n👉 Rule: PRs modifying core architecture or game logic must update at least one of:',
  );
  console.error(
    '   1. a changelog fragment changelog.d/<slug>.<added|changed|fixed|removed|…>.md (see changelog.d/README.md)',
  );
  console.error('   2. docs/tech/architecture.md (or relevant tech doc in docs/tech/)');
  console.error('   3. AGENTS.md');
  console.error('   4. public/locales/de/ and public/locales/en/ (if UI strings changed)');
  console.error(
    "\nOr add [skip docs] to the PR description/title (or the 'no-changelog' label) for chore-only changes.\n",
  );
  process.exit(1);
}

if (matchedCodeFiles.length > 0) {
  console.log(
    `✔ Doc-sync gate passed: ${matchedCodeFiles.length} code file(s) accompanied by ${matchedDocFiles.length} doc/translation update(s).\n`,
  );
} else {
  console.log(
    '✔ Doc-sync gate passed: No core source code modified requiring documentation updates.\n',
  );
}

process.exit(0);
