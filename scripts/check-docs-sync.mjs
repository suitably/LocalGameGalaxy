#!/usr/bin/env node
/**
 * Doc-Sync Guardrail for LocalGameGalaxy
 *
 * Enforces that whenever core gameplay logic or shared modules are modified,
 * the technical documentation in docs/tech/ or AGENTS.md must also be kept up to date.
 *
 * Runs in CI during PR checks.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Get changed files compared to base branch (dev or main)
let changedFiles = [];
try {
  const diffOutput = execSync('git diff --name-only origin/dev...HEAD || git diff --name-only HEAD~1', {
    cwd: ROOT_DIR,
    stdio: 'pipe',
  }).toString();
  changedFiles = diffOutput.split('\n').map(f => f.trim()).filter(Boolean);
} catch (err) {
  console.warn('⚠️ Could not determine git diff. Skipping doc-sync check.');
  process.exit(0);
}

if (changedFiles.length === 0) {
  console.log('✔ No files changed. Doc-sync gate passed.');
  process.exit(0);
}

console.log(`\n📋 [Doc-Sync Gate] Checking ${changedFiles.length} changed file(s)...`);

// RepoLens best practice: Check for skip marker in PR_BODY or commit message
const prBody = process.env.PR_BODY || '';
if (prBody.includes('[skip docs]') || prBody.includes('[skip changelog]')) {
  console.log('✔ Doc-sync gate bypassed by [skip docs] / [skip changelog] marker.\n');
  process.exit(0);
}

// Check if core code was modified
const hasCodeChanges = changedFiles.some(f => 
  (f.startsWith('src/games/') || f.startsWith('src/modules/') || f.startsWith('src/lib/')) &&
  (f.endsWith('.ts') || f.endsWith('.tsx')) &&
  !f.includes('.test.') &&
  !f.includes('.spec.')
);

// Check if documentation, changelog, or rules were touched (RepoLens pattern)
const hasDocChanges = changedFiles.some(f => 
  f === 'CHANGELOG.md' ||
  f.startsWith('docs/tech/') ||
  f === 'AGENTS.md' ||
  f === 'README.md' ||
  f.startsWith('public/locales/')
);

if (hasCodeChanges && !hasDocChanges) {
  console.error('\n❌ [Doc-Sync & Changelog Violation - RepoLens Standard]');
  console.error('Core source code was modified in src/games/, src/modules/, or src/lib/,');
  console.error('but NO documentation was updated in CHANGELOG.md, docs/tech/, AGENTS.md, or public/locales/!');
  console.error('\n👉 Rule: Every PR modifying system architecture or game logic must update:');
  console.error('   1. CHANGELOG.md (under [Unreleased])');
  console.error('   2. docs/tech/architecture.md (or relevant tech doc in docs/tech/)');
  console.error('   3. public/locales/de/ and public/locales/en/ (if UI strings changed)');
  console.error('\nOr add [skip changelog] / [skip docs] to the PR description for chore-only changes.\n');
  process.exit(1);
}

console.log('✔ Doc-sync gate passed: Code changes are properly reflected in documentation/translations.\n');
process.exit(0);
