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
import { getChangedFiles } from './lib/changed-files.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

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

console.log(`\n📋 [Doc-Sync Gate] Checking ${changedFiles.length} changed file(s) against ${baseLabel}...`);

// Check for skip marker in PR_BODY or commit message
const prBody = process.env.PR_BODY || '';
if (prBody.includes('[skip docs]') || prBody.includes('[skip changelog]')) {
  console.log('✔ Doc-sync gate bypassed by [skip docs] marker in PR body.\n');
  process.exit(0);
}

// Check if core code was modified
const matchedCodeFiles = changedFiles.filter(f =>
  (f.startsWith('src/games/') || f.startsWith('src/modules/') || f.startsWith('src/lib/')) &&
  (f.endsWith('.ts') || f.endsWith('.tsx')) &&
  !f.includes('.test.') &&
  !f.includes('.spec.')
);

// Check if documentation, changelog, or translations were touched
const matchedDocFiles = changedFiles.filter(f =>
  f === 'CHANGELOG.md' ||
  f.startsWith('docs/tech/') ||
  f === 'AGENTS.md' ||
  f === 'README.md' ||
  f.startsWith('public/locales/')
);

if (matchedCodeFiles.length > 0 && matchedDocFiles.length === 0) {
  console.error('\n❌ [Doc-Sync & Changelog Gate Violation]');
  console.error(`Core source code was modified (${matchedCodeFiles.length} file(s)), but no documentation or translations were updated!`);
  console.error('Modified code files:');
  for (const f of matchedCodeFiles.slice(0, 10)) {
    console.error(`  - ${f}`);
  }
  if (matchedCodeFiles.length > 10) {
    console.error(`  ... and ${matchedCodeFiles.length - 10} more`);
  }
  console.error('\n👉 Rule: PRs modifying core architecture or game logic must update at least one of:');
  console.error('   1. CHANGELOG.md (under [Unreleased])');
  console.error('   2. docs/tech/architecture.md (or relevant tech doc in docs/tech/)');
  console.error('   3. AGENTS.md');
  console.error('   4. public/locales/de/ and public/locales/en/ (if UI strings changed)');
  console.error('\nOr add [skip docs] to the PR description for chore-only changes.\n');
  process.exit(1);
}

if (matchedCodeFiles.length > 0) {
  console.log(`✔ Doc-sync gate passed: ${matchedCodeFiles.length} code file(s) accompanied by ${matchedDocFiles.length} doc/translation update(s).\n`);
} else {
  console.log('✔ Doc-sync gate passed: No core source code modified requiring documentation updates.\n');
}

process.exit(0);
