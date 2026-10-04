#!/usr/bin/env node
/**
 * Deterministic repository prechecks. Pure Node, no dependencies, no install needed
 * (runs before `npm ci` in CI). Exit code 1 on any error; warnings never fail.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const errors = [];
const warnings = [];
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0')
  .filter((f) => f && existsSync(f)); // skip files deleted in the working tree

const isText = (f) => /\.(ts|tsx|js|jsx|mjs|cjs|json|md|ya?ml|css|html|yml)$/.test(f);
const read = (f) => readFileSync(f, 'utf8');
const textFiles = files.filter((f) => isText(f) && !f.includes('package-lock.json') && !f.startsWith('dev-dist/'));

// 1. Leftover merge/patch artifacts
for (const f of files) {
  if (/\.(orig|rej|bak)$/.test(f) || /(^|\/)(patch|pr\d+)\.diff$/.test(f)) {
    errors.push(`Stray artifact tracked in git: ${f}`);
  }
}

// 2. Merge conflict markers
for (const f of textFiles) {
  if (/^(<<<<<<< |>>>>>>> )/m.test(read(f))) errors.push(`Merge conflict marker in ${f}`);
}

// 3. JSON validity (package.json, locales, baselines, etc.; tsconfig allows comments -> skipped)
for (const f of files.filter((x) => x.endsWith('.json') && !/tsconfig|\.vscode|package-lock/.test(x))) {
  try {
    JSON.parse(read(f));
  } catch (e) {
    errors.push(`Invalid JSON in ${f}: ${e.message}`);
  }
}

// 4. i18n key parity de <-> en (ratchet: known gaps live in scripts/i18n-parity-baseline.json)
const flatten = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${p}${k}.`) : [`${p}${k}`]);
try {
  const de = new Set(flatten(JSON.parse(read('public/locales/de/translation.json'))));
  const en = new Set(flatten(JSON.parse(read('public/locales/en/translation.json'))));
  const gaps = [
    ...[...de].filter((k) => !en.has(k)).map((k) => `en:${k}`),
    ...[...en].filter((k) => !de.has(k)).map((k) => `de:${k}`),
  ];
  const baseline = new Set(JSON.parse(read('scripts/i18n-parity-baseline.json')));
  const fresh = gaps.filter((g) => !baseline.has(g));
  const fixed = [...baseline].filter((g) => !gaps.includes(g));
  if (fresh.length) errors.push(`i18n: ${fresh.length} new missing key(s), e.g. ${fresh.slice(0, 3).join(', ')}`);
  if (fixed.length) errors.push(`i18n: ${fixed.length} baseline gap(s) fixed - remove from scripts/i18n-parity-baseline.json`);
  if (baseline.size) warnings.push(`i18n: ${baseline.size} known parity gap(s) in baseline`);
} catch (e) {
  errors.push(`i18n parity check failed: ${e.message}`);
}

// 5. Focused tests / debugger statements committed
for (const f of textFiles.filter((x) => /\.(test|spec)\.(ts|tsx|js)$/.test(x))) {
  if (/\b(it|test|describe)\.only\(/.test(read(f))) errors.push(`Focused test (.only) in ${f}`);
}
for (const f of textFiles.filter((x) => /^src\/.*\.(ts|tsx)$/.test(x))) {
  if (/^\s*debugger;?\s*$/m.test(read(f))) errors.push(`debugger statement in ${f}`);
}

// 6. Secret patterns
const secretPatterns = [
  [/-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'GitHub token'],
];
for (const f of textFiles.filter((x) => !/^docs\//.test(x) && !/\.example\./.test(x))) {
  const c = read(f);
  for (const [re, label] of secretPatterns) if (re.test(c)) errors.push(`Possible ${label} in ${f}`);
}

// 7. Workflow hygiene: no tabs, explicit permissions, timeouts
for (const f of files.filter((x) => /^\.github\/workflows\/.*\.ya?ml$/.test(x))) {
  const c = read(f);
  if (/\t/.test(c)) errors.push(`Tab character in ${f} (YAML requires spaces)`);
  for (const m of c.matchAll(/^\s*(?:-\s+)?uses:\s*([^\s#]+)/gm)) {
    if (!m[1].startsWith('./') && !/@[0-9a-f]{40}$/.test(m[1])) errors.push(`Action not pinned to a commit SHA in ${f}: ${m[1]}`);
  }
  if (!/^permissions:/m.test(c)) errors.push(`Workflow ${f} has no top-level permissions block`);
  const jobsBlock = c.split(/^jobs:\s*$/m)[1] || '';
  const jobs = (jobsBlock.match(/^  [A-Za-z0-9_-]+:\s*$/gm) || []).length;
  const timeouts = (jobsBlock.match(/timeout-minutes:/g) || []).length;
  if (timeouts < jobs) warnings.push(`Workflow ${f}: not every job sets timeout-minutes`);
}

// 8. Large tracked files
for (const f of files) {
  try {
    const mb = statSync(f).size / 1024 / 1024;
    if (mb > 5) warnings.push(`Large tracked file (${mb.toFixed(1)} MB): ${f}`);
  } catch {
    /* deleted in working tree */
  }
}

for (const w of warnings) console.warn(`⚠ ${w}`);
for (const e of errors) console.error(`✖ ${e}`);
if (errors.length) {
  console.error(`\n${errors.length} precheck error(s).`);
  process.exit(1);
}
console.log(`✔ Repository prechecks passed (${files.length} files, ${warnings.length} warning(s)).`);
