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
 * 4. [WARNING] Component line budget (max 250 lines per .tsx file, same limit as check:budget, which enforces it)
 * 5. [CRITICAL] Tracked server media (server/music/)
 * 6. [CRITICAL] Hard-coded colours (hex, non-black rgb/rgba) in src .tsx files: per-file count ratchet in
 *    scripts/hardcoded-color-baselines.json (a file may only go down; --diff checks changed files only)
 *
 * Usage:
 *   node scripts/check-architecture.mjs           # Full audit with summary
 *   node scripts/check-architecture.mjs --strict  # Exits 1 if any violation found
 *   node scripts/check-architecture.mjs --diff    # Checks only files changed vs git HEAD
 *   node scripts/check-architecture.mjs --update-colors  # Lower colour baselines (never raises them)
 *   node scripts/check-architecture.mjs --init-colors    # Write colour baselines from the current tree
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getChangedFiles as getRepoChangedFiles } from './lib/changed-files.mjs';
import { countHardcodedColors, isColorCheckedFile } from './lib/hardcoded-colors.mjs';
import { compareToBaseline, lowerBaseline, sortCounts } from './lib/lint-budget.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const GAMES_DIR = path.join(SRC_DIR, 'games');
const BASELINE_FILE = path.join(__dirname, 'architecture-baseline.json');
const COLOR_BASELINE_FILE = path.join(__dirname, 'hardcoded-color-baselines.json');

const isStrict = process.argv.includes('--strict');
/** Same limit as MAX_LINES in check-component-budget.js. */
const COMPONENT_MAX_LINES = 250;
const isDiff = process.argv.includes('--diff');
const colorMode = process.argv.includes('--init-colors')
  ? 'init'
  : process.argv.includes('--update-colors')
    ? 'update'
    : 'check';

let baselineEntries = [];
if (fs.existsSync(BASELINE_FILE)) {
  try {
    baselineEntries = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
  } catch (e) {
    console.error(`Failed to parse ${BASELINE_FILE}:`, e.message);
  }
}
const baselineSet = new Set(
  baselineEntries.map((e) => (typeof e === 'string' ? e : `${e.type}:${e.file}`)),
);

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
  return fs
    .readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
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
 * Get changed files compared to base branch/ref
 */
function getChangedFiles() {
  const result = getRepoChangedFiles({ cwd: ROOT_DIR, absolute: true });
  const changed = result.files.filter((f) => {
    const rel = path.relative(ROOT_DIR, f);
    return rel.startsWith('src/') && (rel.endsWith('.ts') || rel.endsWith('.tsx'));
  });

  const baseLabel = result.mergeBase
    ? `${result.baseRef} (merge-base ${result.mergeBase.slice(0, 7)})`
    : result.baseRef;
  console.log(
    `${CYAN}🔍 [Architecture Diff] Checking ${changed.length} changed file(s) against ${baseLabel}...${RESET}\n`,
  );
  return changed;
}

const games = getGameDirectories();
const allFiles = isDiff ? getChangedFiles() : getSourceFiles(SRC_DIR);

const violations = {
  crossGameImports: [],
  rawStorage: [],
  nativeDialogs: [],
  largeComponents: [],
  trackedServerMedia: [],
};
/** Hard-coded colour count per checked file (only files with at least one). */
const colorCounts = {};
/** Files the colour rule looked at, so diff mode compares only those. */
const colorScanned = new Set();

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
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*'))
          continue;

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
      (/\bconfirm\s*\(/.test(line) &&
        !line.includes('ConfirmDialog') &&
        !line.includes('onConfirm'))
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

  // Check 6: Hard-coded colours (count ratchet, evaluated after the scan)
  const posixPath = relativePath.split(path.sep).join('/');
  if (isColorCheckedFile(posixPath)) {
    colorScanned.add(posixPath);
    const colorCount = countHardcodedColors(content);
    if (colorCount > 0) colorCounts[posixPath] = colorCount;
  }

  // Check 4: Large components (> COMPONENT_MAX_LINES for React UI .tsx files; enforced by check:budget)
  if (filePath.endsWith('.tsx') && !relativePath.includes('test')) {
    const nonCommentLines = lines.filter((l) => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    }).length;

    if (nonCommentLines > COMPONENT_MAX_LINES) {
      violations.largeComponents.push({
        file: relativePath,
        lines: lines.length,
        codeLines: nonCommentLines,
      });
    }
  }
}

// Check 5: Tracked Server Media (server/music/ or music/ must never contain git-tracked files)
try {
  const tracked = execSync('git ls-files "server/music" "music"', {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
  });
  const files = tracked
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
  violations.trackedServerMedia.push(...files);
} catch {
  // git not available or command failed
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
  console.log(
    `${RED}${BOLD}✖ Cross-Game Direct Imports Found (${violations.crossGameImports.length})${RESET}`,
  );
  console.log(
    `  Rule: Games must NEVER import from other games (docs/tech/coding-conventions.md §2).`,
  );
  for (const v of violations.crossGameImports) {
    console.log(
      `  ${RED}•${RESET} ${BOLD}${v.file}:${v.line}${RESET} (${v.currentGame} -> ${v.targetGame})`,
    );
    console.log(`    ${CYAN}${v.snippet}${RESET}`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ No Cross-Game Imports${RESET}`);
}

// Report Raw Storage
if (violations.rawStorage.length > 0) {
  hasErrors = true;
  console.log(
    `${RED}${BOLD}✖ Raw localStorage / sessionStorage Bypasses Found (${violations.rawStorage.length})${RESET}`,
  );
  console.log(
    `  Rule: All storage must use src/lib/storage.ts with STORAGE_KEYS (docs/tech/coding-conventions.md §2).`,
  );
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
  console.log(
    `${RED}${BOLD}✖ Native window.confirm / prompt / alert Found (${violations.nativeDialogs.length})${RESET}`,
  );
  console.log(
    `  Rule: Always use MUI Dialog or ConfirmDialog (docs/tech/coding-conventions.md §2).`,
  );
  for (const v of violations.nativeDialogs) {
    console.log(`  ${RED}•${RESET} ${v.file}:${v.line} -> ${CYAN}${v.snippet}${RESET}`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ No blocking window.confirm/prompt/alert${RESET}`);
}

// Report Tracked Server Media
if (violations.trackedServerMedia.length > 0) {
  hasErrors = true;
  console.log(
    `${RED}${BOLD}✖ Tracked Server Music / Media Files Found (${violations.trackedServerMedia.length})${RESET}`,
  );
  console.log(
    `  Rule: Server songs and audio stems must NEVER be tracked in Git (docs/tech/coding-conventions.md §2).`,
  );
  for (const f of violations.trackedServerMedia) {
    console.log(`  ${RED}•${RESET} ${f}`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ No tracked server music/media files${RESET}`);
}

// Report Large Components
if (violations.largeComponents.length > 0) {
  console.log(
    `${YELLOW}${BOLD}⚠ Components Exceeding ${COMPONENT_MAX_LINES} Lines (${violations.largeComponents.length})${RESET}`,
  );
  console.log(
    `  Rule: Keep components at most ${COMPONENT_MAX_LINES} lines (docs/tech/coding-conventions.md §1); \`npm run check:budget\` enforces it.`,
  );
  const sorted = [...violations.largeComponents].sort((a, b) => b.lines - a.lines);
  for (const v of sorted.slice(0, 10)) {
    console.log(
      `  ${YELLOW}•${RESET} ${v.file} (${BOLD}${v.lines} lines${RESET}, ${v.codeLines} code lines)`,
    );
  }
  if (sorted.length > 10) {
    console.log(`  ... and ${sorted.length - 10} more large components.`);
  }
  console.log('');
} else {
  console.log(`${GREEN}✔ All components within line budget${RESET}`);
}

// Report Hard-coded Colours (per-file count ratchet)
const writeColorBaseline = (counts) =>
  fs.writeFileSync(COLOR_BASELINE_FILE, `${JSON.stringify(sortCounts(counts), null, 2)}\n`);
const readColorBaseline = () =>
  fs.existsSync(COLOR_BASELINE_FILE)
    ? JSON.parse(fs.readFileSync(COLOR_BASELINE_FILE, 'utf-8'))
    : {};

if (colorMode === 'init' || colorMode === 'update') {
  if (isDiff) {
    console.error(`${RED}--init-colors / --update-colors need a full scan (no --diff).${RESET}`);
    process.exit(1);
  }
  const fullBaseline = readColorBaseline();
  const { increased: grown } = compareToBaseline(colorCounts, fullBaseline);
  if (colorMode === 'update' && grown.length > 0) {
    console.error(`${RED}Colour counts grew; fix them first (baselines are never raised).${RESET}`);
    for (const g of grown) {
      console.error(`  ${RED}•${RESET} ${g.file}: ${g.current} > ${g.baseline}`);
    }
    process.exit(1);
  }
  writeColorBaseline(colorMode === 'init' ? colorCounts : lowerBaseline(colorCounts, fullBaseline));
  console.log(`${GREEN}✔ Wrote scripts/hardcoded-color-baselines.json${RESET}`);
  process.exit(0);
}

const fullColorBaseline = readColorBaseline();
// In diff mode only the changed (and checked) files take part in the comparison.
const scopedBaseline = isDiff
  ? Object.fromEntries(Object.entries(fullColorBaseline).filter(([f]) => colorScanned.has(f)))
  : fullColorBaseline;
const { increased: colorIncreased, stale: colorStale } = compareToBaseline(
  colorCounts,
  scopedBaseline,
);
const colorTotal = Object.values(colorCounts).reduce((sum, n) => sum + n, 0);
let colorFailed = false;

if (colorIncreased.length > 0) {
  colorFailed = true;
  console.log(
    `${RED}${BOLD}✖ Hard-coded Colours Increased (${colorIncreased.length} file(s))${RESET}`,
  );
  console.log(
    `  Rule: Use theme tokens (theme.palette.*, piece palette), not hex / rgb() literals (DESIGN.md §2, docs/tech/coding-conventions.md §2). Baselines are never raised.`,
  );
  for (const { file, baseline: allowed, current } of colorIncreased) {
    console.log(`  ${RED}•${RESET} ${file}: ${current} colour literal(s), allowed ${allowed}`);
  }
  console.log('');
} else {
  console.log(
    `${GREEN}✔ No new hard-coded colours (${colorTotal} existing literal(s) in ${Object.keys(colorCounts).length} file(s), none above baseline)${RESET}`,
  );
}

if (colorStale.length > 0) {
  if (isDiff) {
    console.log(
      `${YELLOW}ℹ ${colorStale.length} colour baseline(s) are higher than the current count - run \`npm run check:architecture -- --update-colors\`.${RESET}`,
    );
  } else {
    colorFailed = true;
    console.log(
      `${YELLOW}${BOLD}✖ Hard-coded colours were removed - lock in the progress (${colorStale.length} file(s))${RESET}`,
    );
    for (const { file, baseline: allowed, current } of colorStale) {
      console.log(
        `  ${YELLOW}•${RESET} ${file}: ${current} colour literal(s), baseline ${allowed}`,
      );
    }
    console.log(
      `  Run \`npm run check:architecture -- --update-colors\` and commit scripts/hardcoded-color-baselines.json.\n`,
    );
  }
}

if (colorFailed) {
  console.error(`${RED}${BOLD}✖ Architecture gate failed: hard-coded colour ratchet.${RESET}\n`);
  process.exit(1);
}

// Summary and Exit Code
const allCritical = [
  ...violations.crossGameImports.map((v) => ({
    type: 'crossGameImports',
    file: v.file,
    detail: `${v.currentGame} -> ${v.targetGame}`,
  })),
  ...violations.rawStorage.map((v) => ({ type: 'rawStorage', file: v.file, detail: v.snippet })),
  ...violations.nativeDialogs.map((v) => ({
    type: 'nativeDialogs',
    file: v.file,
    detail: v.snippet,
  })),
  ...violations.trackedServerMedia.map((f) => ({
    type: 'trackedServerMedia',
    file: f,
    detail: 'tracked server media',
  })),
];

const totalViolations = allCritical.length;

// Check against baseline (ratchet mechanism)
const freshViolations = allCritical.filter((v) => !baselineSet.has(`${v.type}:${v.file}`));
const currentKeys = new Set(allCritical.map((v) => `${v.type}:${v.file}`));
const resolvedBaselineGaps = [...baselineSet].filter((key) => !currentKeys.has(key));

if (!isDiff && resolvedBaselineGaps.length > 0) {
  console.log(
    `${YELLOW}ℹ Fixed ${resolvedBaselineGaps.length} architecture baseline gap(s) - remove them from scripts/architecture-baseline.json to lock in progress.${RESET}`,
  );
}

if (totalViolations === 0) {
  console.log(`${GREEN}${BOLD}🎉 Architecture Audit Passed! All boundaries respected.${RESET}\n`);
  process.exit(0);
} else {
  console.log(
    `${BOLD}Summary: ${RED}${totalViolations} critical violations (${freshViolations.length} new)${RESET}, ${YELLOW}${violations.largeComponents.length} oversized components.${RESET}`,
  );

  // Both diff mode and full scan fail on new / un-baselined critical violations
  if (freshViolations.length > 0) {
    console.error(
      `\n${RED}${BOLD}✖ Architecture gate failed: Found ${freshViolations.length} critical boundary violation(s) not in baseline.${RESET}\n`,
    );
    for (const v of freshViolations) {
      console.error(`  ${RED}• [${v.type}] ${v.file}${RESET} (${v.detail})`);
    }
    console.error('');
    process.exit(1);
  }

  if (isStrict) {
    console.error(
      `\n${RED}${BOLD}✖ Strict mode enabled: Audit failed with ${totalViolations} violations.${RESET}\n`,
    );
    process.exit(1);
  }

  console.log(
    `\n${YELLOW}✔ All critical violations are covered by architecture baseline ratchet.${RESET}\n`,
  );
  process.exit(0);
}
