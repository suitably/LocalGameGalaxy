#!/usr/bin/env node
/**
 * Tabletop Simulator compatibility harness (dev-only). See scripts/tts-compat/README.md.
 *   node scripts/tts-compat/run.mjs [--fixture] [--ids a,b] [--offline] [--check-images]
 *        [--out file.json] [--baseline before.json] [--top N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSave, aggregate, tierRegressions } from './analyze.mjs';
import { loadParser } from './load-parser.mjs';
import { checkImageHosts, fetchWorkshopSave } from './fetch.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(DIR, '.cache');

function args() {
  const a = process.argv.slice(2);
  const get = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  return {
    fixture: a.includes('--fixture'),
    offline: a.includes('--offline'),
    checkImages: a.includes('--check-images'),
    ids: get('--ids')?.split(',').filter(Boolean),
    out: get('--out'),
    baseline: get('--baseline'),
    top: Number(get('--top') ?? 20),
  };
}

async function loadSaves(opts, parser) {
  if (opts.fixture) {
    const save = JSON.parse(fs.readFileSync(path.join(DIR, 'fixture.save.json'), 'utf8'));
    return { saves: [{ id: 'fixture', save }], errors: [] };
  }
  const corpus = JSON.parse(fs.readFileSync(path.join(DIR, 'corpus.json'), 'utf8'));
  const ids = opts.ids ?? corpus.ids;
  fs.mkdirSync(CACHE, { recursive: true });
  const saves = [];
  const errors = [];
  for (const id of ids) {
    const cached = path.join(CACHE, `${id}.json`);
    try {
      if (!fs.existsSync(cached)) {
        if (opts.offline) throw new Error('not cached (--offline)');
        const save = await fetchWorkshopSave(id, parser.mod.decodeModBuffer);
        fs.writeFileSync(cached, JSON.stringify(save));
      }
      saves.push({ id, save: JSON.parse(fs.readFileSync(cached, 'utf8')) });
    } catch (err) {
      errors.push({ id, error: String(err?.message ?? err).slice(0, 200) });
    }
  }
  return { saves, errors };
}

const opts = args();
const parser = await loadParser();
try {
  const { saves, errors } = await loadSaves(opts, parser);
  const { parseTtsSaveFile, sanitizeTtsUrl } = parser.mod;
  const mods = {};
  for (const { id, save } of saves) {
    const result = analyzeSave(save, { parse: parseTtsSaveFile, sanitizeUrl: sanitizeTtsUrl });
    if (opts.checkImages) await checkImageHosts(save, result, sanitizeTtsUrl);
    mods[id] = result;
  }
  const report = {
    generatedAt: new Date().toISOString().slice(0, 10),
    aggregate: aggregate(Object.values(mods), opts.top),
    unavailable: errors,
    mods,
  };
  if (opts.baseline) {
    const before = JSON.parse(fs.readFileSync(opts.baseline, 'utf8')).mods;
    const tiers = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.tier]));
    report.regressions = tierRegressions(tiers(before), tiers(mods));
  }
  const json = JSON.stringify(report, null, 2);
  if (opts.out) fs.writeFileSync(opts.out, json + '\n');
  else console.log(json);
  console.error(
    `mods: ${report.aggregate.mods}, tiers: ${JSON.stringify(report.aggregate.perTier)}, unavailable: ${errors.length}`,
  );
  if (report.regressions?.length) {
    console.error(`TIER REGRESSION: ${report.regressions.join(', ')}`);
    process.exitCode = 1;
  }
} finally {
  parser.cleanup();
}
