#!/usr/bin/env node

/**
 * Architecture & Boundary Gatekeeper [ID: SCRIPT-ARCH-CHECK]
 *
 * Enforces SOLID boundaries, modularity rules, and web best practices
 * defined in AGENTS.md.
 *
 * Rules checked:
 * 1. [CRITICAL] No Cross-Game Imports (src/games/<A> importing from src/games/<B>)
 * 2. [CRITICAL] No raw localStorage/sessionStorage outside src/lib/storage.ts
 * 3. [CRITICAL] No native window.confirm, window.prompt, window.alert
 * 4. [WARNING/ERROR] Component line budget (max 300 lines per .tsx file)
 *
 * Usage:
 *   node scripts/check-architecture.mjs           # Full audit with summary
 *   node scripts/check-architecture.mjs --strict  # Exits 1 if any violation found
 *   node scripts/check-architecture.mjs --diff    # Checks only files changed vs git HEAD
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const GAMES_DIR = path.join(SRC_DIR, 'games');

const isStrict = process.argv.includes('--strict');
const isDiff = process.argv.includes('--diff');

// ANSI Colors
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

/**
 * Get all games subdirectories
 */
function getGameDirectories() {
  if (!fs.existsSync(GAMES_DIR)) return [];
  return fs.readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

/**
 * Recursively get all source files
 */
function getSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'dev-dist') {
        getSourceFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Get changed files compared to git HEAD (if git is available)
 */
function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', { cwd: ROOT_DIR, encoding: 'utf-8' });
    return output
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.startsWith('src/') && (f.endsWith('.ts') || f.endsWith('.tsx')))
      .map(f => path.join(ROOT_DIR, f));
  } catch {
    return [];
  }
}

const games = getGameDirectories();
const allFiles = isDiff ? getChangedFiles() : getSourceFiles(SRC_DIR);

const violations = {
  crossGameImports: [],
  rawStorage: [],
  nativeDialogs: [],
  largeComponents: [],
};

// 1. Scan files
for (const filePath of allFiles) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Check 1: Cross-Game Imports
  if (filePath.startsWith(GAMES_DIR)) {
    const pathParts = path.relative(GAMES_DIR, filePath).split(path.sep);
    const currentGame = pathParts[0];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('import') && !line.includes('from')) continue;

      for (const otherGame of games) {
        if (otherGame === currentGame) continue;

        // Match patterns:
        // from '../<otherGame>/...'
        // from '../../<otherGame>/...'
        // from 'src/games/<otherGame>/...'
        // from '@/games/<otherGame>/...'
        const crossGamePattern = new RegExp(`from\\s+['"][^'"]*\\b${otherGame}\\b[^'"]*['"]`);
        if (crossGamePattern.test(line)) {
          violations.crossGameImports.push({
            file: relativePath,
            line: i + 1,
            snippet: line.trim(),
            currentGame,
            targetGame: otherGame,
          });
        }
      }
    }
  }

  // Check 2: Raw localStorage / sessionStorage outside storage.ts
  const isStorageLib = relativePath === 'src/lib/storage.ts';
  const isTestFile = relativePath.endsWith('.test.ts') || relativePath.endsWith('.test.tsx');

  if (!isStorageLib && !isTestFile) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('localStorage.') || line.includes('sessionStorage.')) {
        // Skip comment lines
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

        violations.rawStorage.push({
          file: relativePath,
          line: i + 1,
          snippet: trimmed,
        });
      }
    }
  }

  // Check 3: Native window.confirm / prompt / alert
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.includes('window.confirm') ||
      line.includes('window.prompt') ||
      line.includes('window.alert') ||
      /\bconfirm\s*\(/.test(line) && !line.includes('ConfirmDialog') && !line.includes('onConfirm')
    ) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

      violations.nativeDialogs.push({
        file: relativePath,
        line: i + 1,
        snippet: trimmed,
      });
    }
  }

  // Check 4: Large components (>300 lines for React UI .tsx files)
  if (filePath.endsWith('.tsx') && !relativePath.includes('test')) {
    const nonCommentLines = lines.filter(l => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    }).length;

    if (nonCommentLines > 300) {
      violations.largeComponents.push({
        file: relativePath,
        lines: lines.length,
        codeLines: nonCommentLines,
      });
    }
  }
}

// 2. Output Report
console.log(`\n${BOLD}${CYAN}=== LocalGameGalaxy Architecture & Boundary Audit ===${RESET}\n`);
if (isDiff) {
  console.log(`Mode: ${YELLOW}Git Diff (Checking ${allFiles.length} changed files)${RESET}\n`);
} else {
  console.log(`Mode: ${CYAN}Full Repository Scan (${allFiles.length} files)${RESET}\n`);
}

let hasErrors = false;

// Report Cross-Game Imports
if (violations.crossGameImports.length > 0) {
  hasErrors = true;
  console.log(`${RED}${BOLD}✖ Cross-Game Direct Imports Found (${violations.crossGameImports.length})${RESET}`);
  console.log(`  Rule: Games must NEVER import from other games (AGENTS.md Section 4.3).`);
  for (const v of violations.crossGameImports) {
    console.log(`  ${RED}•${RESET} ${BOLD}${v.file}:${v.line}${RESET} (${v.currentGame} -> ${v.targetGame})`);
    console.log(`    ${CYAN}${v.snippet}${RESET}`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ No Cross-Game Imports${RESET}`);
}

// Report Raw Storage
if (violations.rawStorage.length > 0) {
  hasErrors = true;
  console.log(`${RED}${BOLD}✖ Raw localStorage / sessionStorage Bypasses Found (${violations.rawStorage.length})${RESET}`);
  console.log(`  Rule: All storage must use src/lib/storage.ts with STORAGE_KEYS (AGENTS.md Section 4.5).`);
  for (const v of violations.rawStorage.slice(0, 10)) {
    console.log(`  ${RED}•${RESET} ${v.file}:${v.line} -> ${CYAN}${v.snippet}${RESET}`);
  }
  if (violations.rawStorage.length > 10) {
    console.log(`  ... and ${violations.rawStorage.length - 10} more occurrences.`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ No raw localStorage/sessionStorage bypasses${RESET}`);
}

// Report Native Dialogs
if (violations.nativeDialogs.length > 0) {
  hasErrors = true;
  console.log(`${RED}${BOLD}✖ Native window.confirm / prompt / alert Found (${violations.nativeDialogs.length})${RESET}`);
  console.log(`  Rule: Always use MUI Dialog or ConfirmDialog (AGENTS.md Section 4.5).`);
  for (const v of violations.nativeDialogs) {
    console.log(`  ${RED}•${RESET} ${v.file}:${v.line} -> ${CYAN}${v.snippet}${RESET}`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ No blocking window.confirm/prompt/alert${RESET}`);
}

// Report Large Components
if (violations.largeComponents.length > 0) {
  console.log(`${YELLOW}${BOLD}⚠ Components Exceeding 300 Lines (${violations.largeComponents.length})${RESET}`);
  console.log(`  Rule: Keep components small (< 250-300 lines) to satisfy SRP (AGENTS.md Section 4.2).`);
  const sorted = [...violations.largeComponents].sort((a, b) => b.lines - a.lines);
  for (const v of sorted.slice(0, 10)) {
    console.log(`  ${YELLOW}•${RESET} ${v.file} (${BOLD}${v.lines} lines${RESET}, ${v.codeLines} code lines)`);
  }
  if (sorted.length > 10) {
    console.log(`  ... and ${sorted.length - 10} more large components.`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ All components within line budget${RESET}`);
}

// Summary and Exit Code
const totalViolations = violations.crossGameImports.length + violations.rawStorage.length + violations.nativeDialogs.length;

if (totalViolations === 0) {
  console.log(`${GREEN}${BOLD}🎉 Architecture Audit Passed! All boundaries respected.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${BOLD}Summary: ${RED}${totalViolations} critical violations${RESET}, ${YELLOW}${violations.largeComponents.length} oversized components.${RESET}`);
  if (isStrict) {
    console.error(`\n${RED}${BOLD}✖ Strict mode enabled: Audit failed.${RESET}\n`);
    process.exit(1);
  } else if (isDiff && (violations.crossGameImports.length > 0 || violations.nativeDialogs.length > 0)) {
    console.error(`\n${RED}${BOLD}✖ Diff check failed: Newly modified files contain critical architectural violations.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${CYAN}💡 Run with --strict to enforce in CI, or --diff to enforce on changed files only.${RESET}\n`);
    process.exit(0);
  }
}
