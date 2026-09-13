#!/usr/bin/env node

/**
 * Component Size & God Component Prevention Checker
 * Enforces Single Responsibility Principle (SRP) and file size budgets.
 * 
 * Rules:
 * 1. Hard limit: Max 250 lines per component (.tsx).
 * 2. Warning: Components > 200 lines should consider extracting hooks/sub-components.
 * 3. Ratchet: Existing legacy components in legacy-component-baselines.json must not GROW.
 * 4. Graduation: When a legacy component shrinks <= 250 lines, it is flagged to be removed from the baseline.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_LINES = 250;
const WARN_LINES = 200;
const SRC_DIR = path.resolve(__dirname, '../src');
const BASELINE_FILE = path.resolve(__dirname, 'legacy-component-baselines.json');

let baselines = {};
if (fs.existsSync(BASELINE_FILE)) {
  try {
    baselines = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch (err) {
    console.error(`⚠️ Failed to parse ${BASELINE_FILE}:`, err.message);
  }
}

function findTsxFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const allFiles = findTsxFiles(SRC_DIR);
const errors = [];
const warnings = [];
const graduated = [];
let passCount = 0;
let legacyCount = 0;

for (const filePath of allFiles) {
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lineCount = content.split('\n').length;

  const baselineLimit = baselines[relPath];

  if (baselineLimit !== undefined) {
    // Legacy component tracked in baseline
    if (lineCount <= MAX_LINES) {
      graduated.push({ file: relPath, lines: lineCount, was: baselineLimit });
      passCount++;
    } else if (lineCount > baselineLimit) {
      errors.push({
        file: relPath,
        lines: lineCount,
        message: `Legacy component grew from ${baselineLimit} to ${lineCount} lines (+${lineCount - baselineLimit}). God components must not expand!`
      });
      legacyCount++;
    } else {
      legacyCount++;
    }
  } else {
    // New or standard component
    if (lineCount > MAX_LINES) {
      errors.push({
        file: relPath,
        lines: lineCount,
        message: `Exceeds max component limit of ${MAX_LINES} lines (${lineCount} lines). Decompose into custom hooks and sub-components.`
      });
    } else if (lineCount > WARN_LINES) {
      warnings.push({
        file: relPath,
        lines: lineCount,
        message: `Approaching limit (${lineCount}/${MAX_LINES} lines). Consider extracting hooks or sub-components.`
      });
      passCount++;
    } else {
      passCount++;
    }
  }
}

console.log('\n🔍 --- Component Budget & Anti-God-Component Report ---');
console.log(`📁 Total components scanned: ${allFiles.length}`);
console.log(`✅ Passing (<= ${WARN_LINES} lines): ${passCount - warnings.length}`);
console.log(`⚠️  Approaching limit (${WARN_LINES}-${MAX_LINES} lines): ${warnings.length}`);
console.log(`⏳ Legacy tracked components (> ${MAX_LINES} lines): ${legacyCount}`);

if (graduated.length > 0) {
  console.log('\n🎉 Graduated Components (Decomposed <= 250 lines!):');
  for (const item of graduated) {
    console.log(`   ✨ ${item.file}: now ${item.lines} lines (was ${item.was}). Can be removed from baseline!`);
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings (Approaching Limit):');
  for (const item of warnings) {
    console.log(`   🔸 ${item.file} (${item.lines} lines)`);
  }
}

if (errors.length > 0) {
  console.log('\n❌ VIOLATIONS FOUND:');
  for (const item of errors) {
    console.log(`   ⛔ ${item.file}: ${item.message}`);
  }
  console.log('\n💡 Resolution: Extract state/effects into custom hooks and DOM sections into co-located sub-components.\n');
  process.exit(1);
} else {
  console.log('\n✨ All components meet the architectural budget!\n');
  process.exit(0);
}
