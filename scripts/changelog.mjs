#!/usr/bin/env node
/**
 * Changelog fragments and release versions (#593). Rules: CONTRIBUTING.md, docs/workflows/ci-cd-pipelines.md.
 *
 *   node scripts/changelog.mjs check                       validate changelog.d/ and docs/log.d/
 *   node scripts/changelog.mjs next-version [--bump auto|major|minor|patch] [--version X.Y.Z]
 *                                                          print the next version ("" = nothing to release)
 *   node scripts/changelog.mjs collect <version> [--date YYYY-MM-DD]
 *                                                          fragments → CHANGELOG.md section, delete fragments
 *   node scripts/changelog.mjs collect-log                 docs/log.d/ → top of docs/log.md, delete fragments
 *   node scripts/changelog.mjs bump <version>              all package.json / package-lock.json + Android version
 *   node scripts/changelog.mjs release <version> [--date YYYY-MM-DD]
 *                                                          collect + collect-log + bump (release PR)
 *   node scripts/changelog.mjs notes <version>             print the CHANGELOG section (release text)
 *   node scripts/changelog.mjs verify <version>            every version field and CHANGELOG agree
 *
 * --root <dir> runs against another checkout (tests).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IGNORED_FILES,
  bumpGradle,
  bumpLockfile,
  bumpPackageJson,
  collectChangelog,
  collectLog,
  extractNotes,
  nextVersion,
  parseFragmentName,
  parseUnreleased,
  parseVersion,
  readGradleVersionName,
  validateFragment,
  validateLogFragment,
  verifyRelease,
} from './lib/changelog.mjs';

const PACKAGE_DIRS = ['.', 'server', 'signaling'];
const GRADLE = 'android/app/build.gradle';

function parseArgs(argv) {
  const opts = { root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), args: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') opts.root = path.resolve(argv[++i]);
    else if (a === '--date') opts.date = argv[++i];
    else if (a === '--bump') opts.bump = argv[++i];
    else if (a === '--version') opts.version = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option: ${a}`);
    else opts.args.push(a);
  }
  return opts;
}

function listDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => !IGNORED_FILES.has(name) && fs.statSync(path.join(dir, name)).isFile())
    .sort();
}

function readFragments(root) {
  const dir = path.join(root, 'changelog.d');
  return listDir(dir).map((name) => ({
    name,
    file: path.join(dir, name),
    type: parseFragmentName(name)?.type,
    content: fs.readFileSync(path.join(dir, name), 'utf8'),
  }));
}

function readLogFragments(root) {
  const dir = path.join(root, 'docs', 'log.d');
  return listDir(dir).map((name) => ({
    name,
    file: path.join(dir, name),
    content: fs.readFileSync(path.join(dir, name), 'utf8'),
  }));
}

function validateAll(root) {
  return [
    ...readFragments(root).flatMap((f) =>
      validateFragment(f.name, f.content).map((e) => `changelog.d/${e}`),
    ),
    ...readLogFragments(root).flatMap((f) =>
      validateLogFragment(f.name, f.content).map((e) => `docs/log.d/${e}`),
    ),
  ];
}

function assertValid(root) {
  const errors = validateAll(root);
  if (errors.length) throw new Error(`invalid fragments:\n  - ${errors.join('\n  - ')}`);
}

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (root, rel, text) => fs.writeFileSync(path.join(root, rel), text);
const today = () => new Date().toISOString().slice(0, 10);

function requireVersion(v) {
  if (!v) throw new Error('missing <version> (X.Y.Z, without "v")');
  parseVersion(v);
  return v;
}

function collect(root, version, date) {
  assertValid(root);
  const fragments = readFragments(root);
  write(
    root,
    'CHANGELOG.md',
    collectChangelog(read(root, 'CHANGELOG.md'), fragments, version, date),
  );
  for (const f of fragments) fs.rmSync(f.file);
  return fragments.length;
}

function collectLogFragments(root) {
  assertValid(root);
  const fragments = readLogFragments(root);
  if (fragments.length)
    write(root, 'docs/log.md', collectLog(read(root, 'docs/log.md'), fragments));
  for (const f of fragments) fs.rmSync(f.file);
  return fragments.length;
}

function bump(root, version) {
  const changed = [];
  for (const dir of PACKAGE_DIRS) {
    for (const [file, fn] of [
      ['package.json', bumpPackageJson],
      ['package-lock.json', bumpLockfile],
    ]) {
      const rel = path.join(dir, file);
      if (!fs.existsSync(path.join(root, rel))) continue;
      write(root, rel, fn(read(root, rel), version));
      changed.push(rel);
    }
  }
  write(root, GRADLE, bumpGradle(read(root, GRADLE), version));
  return [...changed, GRADLE];
}

function run(opts) {
  const [command, version] = opts.args;
  const { root } = opts;
  switch (command) {
    case 'check': {
      const errors = validateAll(root);
      if (errors.length) {
        console.error(`❌ Invalid fragments:\n  - ${errors.join('\n  - ')}`);
        return 1;
      }
      const n = readFragments(root).length;
      const m = readLogFragments(root).length;
      console.log(`✔ ${n} changelog fragment(s) and ${m} docs log fragment(s) are valid.`);
      return 0;
    }
    case 'next-version': {
      assertValid(root);
      const bumpArg = opts.bump || 'auto';
      if (!['auto', 'major', 'minor', 'patch'].includes(bumpArg)) {
        throw new Error(`--bump must be auto, major, minor or patch, not ${bumpArg}`);
      }
      const current = JSON.parse(read(root, 'package.json')).version;
      const next = nextVersion({
        current,
        types: readFragments(root).map((f) => f.type),
        legacyHeadings: [...parseUnreleased(read(root, 'CHANGELOG.md')).categories.keys()],
        bump: bumpArg,
        override: opts.version ? requireVersion(opts.version) : undefined,
      });
      process.stdout.write(next ? `${next}\n` : '');
      return 0;
    }
    case 'collect': {
      const n = collect(root, requireVersion(version), opts.date || today());
      console.log(`✔ Collected ${n} fragment(s) into CHANGELOG.md [${version}].`);
      return 0;
    }
    case 'collect-log': {
      console.log(`✔ Collected ${collectLogFragments(root)} fragment(s) into docs/log.md.`);
      return 0;
    }
    case 'bump': {
      const files = bump(root, requireVersion(version));
      console.log(`✔ Version ${version} written to ${files.join(', ')}.`);
      return 0;
    }
    case 'release': {
      requireVersion(version);
      const n = collect(root, version, opts.date || today());
      const m = collectLogFragments(root);
      bump(root, version);
      console.log(
        `✔ Release ${version}: ${n} changelog and ${m} docs log fragment(s) collected, versions bumped.`,
      );
      return 0;
    }
    case 'notes': {
      const notes = extractNotes(read(root, 'CHANGELOG.md'), requireVersion(version));
      if (!notes) {
        console.error(`❌ CHANGELOG.md has no section for ${version}`);
        return 1;
      }
      process.stdout.write(`${notes}\n`);
      return 0;
    }
    case 'verify': {
      requireVersion(version);
      const packages = {};
      for (const dir of PACKAGE_DIRS) {
        for (const file of ['package.json', 'package-lock.json']) {
          const rel = path.posix.join(dir, file);
          if (fs.existsSync(path.join(root, rel)))
            packages[rel] = JSON.parse(read(root, rel)).version;
        }
      }
      const errors = verifyRelease(
        {
          packages,
          gradleVersionName: readGradleVersionName(read(root, GRADLE)),
          changelog: read(root, 'CHANGELOG.md'),
        },
        version,
      );
      if (errors.length) {
        console.error(`❌ Release ${version} is inconsistent:\n  - ${errors.join('\n  - ')}`);
        return 1;
      }
      console.log(`✔ Every version field and CHANGELOG.md agree on ${version}.`);
      return 0;
    }
    default:
      throw new Error(
        `unknown command "${command ?? ''}" (check, next-version, collect, collect-log, bump, release, notes, verify)`,
      );
  }
}

try {
  process.exitCode = run(parseArgs(process.argv.slice(2)));
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exitCode = 1;
}
