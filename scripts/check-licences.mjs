#!/usr/bin/env node
/**
 * Dependency licence gate (#594). Reads production dependencies from the lockfiles (no install).
 *
 *   node scripts/check-licences.mjs                      check root, server/ and signaling/
 *   node scripts/check-licences.mjs --notice server --out <file>
 *       write THIRD_PARTY_LICENSES.txt for one package (licence texts from <dir>/node_modules)
 *
 * Allow-list and overrides: scripts/lib/licences.mjs. Docs: docs/tech/dependencies.md.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNotice, findViolations, productionPackages } from './lib/licences.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = [
  { dir: '.', title: 'Nexumia web and Android app' },
  { dir: 'server', title: 'Nexumia server' },
  { dir: 'signaling', title: 'Nexumia signaling tracker' },
];

function readLock(dir) {
  return JSON.parse(readFileSync(join(ROOT, dir, 'package-lock.json'), 'utf8'));
}

function licenceFileText(dir, pkg) {
  const pkgDir = join(ROOT, dir, pkg.path);
  if (!existsSync(pkgDir)) return null;
  const files = readdirSync(pkgDir)
    .filter((f) => /^(licen[cs]e|copying|notice)/i.test(f))
    .sort();
  if (files.length === 0) return null;
  return files.map((f) => readFileSync(join(pkgDir, f), 'utf8').trim()).join('\n\n');
}

function check() {
  let failed = false;
  for (const { dir } of PACKAGES) {
    const packages = productionPackages(readLock(dir));
    const violations = findViolations(packages);
    const label = dir === '.' ? 'root' : dir;
    if (violations.length === 0) {
      console.log(`✓ ${label}: ${packages.length} production packages, all licences allowed`);
      continue;
    }
    failed = true;
    console.error(`✗ ${label}: licence not on the allow-list`);
    for (const v of violations) console.error(`  ${v.name}@${v.version}: ${v.license ?? 'none'}`);
  }
  if (failed) {
    console.error(
      '\nReview the licence; add it to scripts/lib/licences.mjs only if AGPL-compatible.',
    );
    process.exit(1);
  }
}

function notice(dir, out) {
  const entry = PACKAGES.find((p) => p.dir === dir);
  if (!entry) throw new Error(`Unknown package directory "${dir}"`);
  const packages = productionPackages(readLock(dir));
  const violations = findViolations(packages);
  if (violations.length > 0) {
    console.error(`Not allow-listed: ${violations.map((v) => v.name).join(', ')}`);
    process.exit(1);
  }
  if (!existsSync(join(ROOT, dir, 'node_modules'))) {
    console.error(`${dir}/node_modules missing: run npm ci in ${dir}/ first`);
    process.exit(1);
  }
  const text = buildNotice(entry.title, packages, (pkg) => licenceFileText(dir, pkg));
  if (out) {
    writeFileSync(resolve(out), text);
    console.log(`Wrote ${out} (${packages.length} packages)`);
  } else {
    process.stdout.write(text);
  }
}

const args = process.argv.slice(2);
const noticeIdx = args.indexOf('--notice');
if (noticeIdx === -1) {
  check();
} else {
  const outIdx = args.indexOf('--out');
  notice(args[noticeIdx + 1] ?? '', outIdx === -1 ? undefined : args[outIdx + 1]);
}
