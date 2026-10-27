#!/usr/bin/env node
/**
 * Production dependency audit (#592): runs `npm audit --omit=dev --json` in the root, server/
 * and signaling/ projects and fails on high or critical advisories that are not in
 * scripts/audit-allowlist.json (entries carry a reason and an expiry date).
 *
 * Blocking in release.yml (gates), advisory in ci.yml (continue-on-error).
 *
 * Usage: node scripts/check-audit.mjs [--severity high|critical] [--project <dir> ...]
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  collectAdvisories,
  evaluateAdvisories,
  parseAllowlist,
  SEVERITY_RANK,
} from './lib/audit.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST = path.join(ROOT_DIR, 'scripts', 'audit-allowlist.json');
const DEFAULT_PROJECTS = ['.', 'server', 'signaling'];

function parseArgs(argv) {
  const projects = [];
  let severity = 'high';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project') projects.push(argv[++i]);
    else if (argv[i] === '--severity') severity = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!(severity in SEVERITY_RANK)) throw new Error(`unknown severity: ${severity}`);
  return { projects: projects.length ? projects : DEFAULT_PROJECTS, severity };
}

function runAudit(project) {
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
    cwd: path.join(ROOT_DIR, project),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  // npm audit exits 1 when it finds anything; only unparseable output is an error
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(
      `npm audit in ${project} returned no JSON (exit ${result.status}): ${result.stderr.slice(0, 500)}`,
    );
  }
}

function main() {
  const { projects, severity } = parseArgs(process.argv.slice(2));
  const { entries, errors } = parseAllowlist(JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')));
  if (errors.length) {
    console.error('❌ scripts/audit-allowlist.json is invalid:');
    for (const e of errors) console.error(`   - ${e}`);
    process.exit(1);
  }

  const advisories = projects.flatMap((project) =>
    collectAdvisories(runAudit(project), { minSeverity: severity, project }),
  );
  const today = new Date().toISOString().slice(0, 10);
  const { blocking, allowed, expiredMatches, unused } = evaluateAdvisories(
    advisories,
    entries,
    today,
  );

  const line = (a) =>
    `   - [${a.project}] ${a.id} ${a.package} (${a.severity}) ${a.title} ${a.url}`;
  for (const a of allowed)
    console.log(`ℹ️  allowed until ${a.expires}: ${line(a).trim()} — ${a.reason}`);
  for (const a of expiredMatches)
    console.warn(`⚠️  allow-list entry expired on ${a.expires}: ${a.id} ${a.package}`);
  for (const e of unused) console.warn(`⚠️  allow-list entry matches nothing (remove it): ${e.id}`);

  if (blocking.length) {
    console.error(`\n❌ ${blocking.length} production advisory(ies) at ${severity} or above:`);
    for (const a of blocking) console.error(line(a));
    console.error(
      '\nUpdate the dependency, or accept the advisory in scripts/audit-allowlist.json with a reason and an expiry date (docs/workflows/ci-cd-pipelines.md).',
    );
    process.exit(1);
  }
  console.log(
    `✔ No unaccepted production advisories at ${severity} or above in ${projects.join(', ')}.`,
  );
}

try {
  main();
} catch (err) {
  console.error(`❌ Audit failed: ${err.message}`);
  process.exit(1);
}
