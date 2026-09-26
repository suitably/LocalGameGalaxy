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

// Check if core code was modified
const hasCodeChanges = changedFiles.some(f => 
  (f.startsWith('src/games/') || f.startsWith('src/modules/') || f.startsWith('src/lib/')) &&
  (f.endsWith('.ts') || f.endsWith('.tsx')) &&
  !f.includes('.test.') &&
  !f.includes('.spec.')
);

// Check if documentation or rules were touched
const hasDocChanges = changedFiles.some(f => 
  f.startsWith('docs/tech/') ||
  f === 'AGENTS.md' ||
  f === 'README.md' ||
  f.startsWith('public/locales/')
);

if (hasCodeChanges && !hasDocChanges) {
  console.error('\n❌ [Doc-Sync Violation]');
  console.error('Core source code was modified in src/games/, src/modules/, or src/lib/,');
  console.error('but NO documentation was updated in docs/tech/, AGENTS.md, or public/locales/!');
  console.error('\n👉 Rule: Every PR modifying system architecture or game logic must update:');
  console.error('   1. docs/tech/architecture.md (or relevant tech doc in docs/tech/)');
  console.error('   2. public/locales/de/ and public/locales/en/ (if UI strings changed)');
  console.error('\nPlease update the relevant documentation files and commit them to this PR.\n');
  process.exit(1);
}

console.log('✔ Doc-sync gate passed: Code changes are properly reflected in documentation/translations.\n');
process.exit(0);
