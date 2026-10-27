#!/usr/bin/env node
/**
 * Generates the Wordle guess-validation word lists from Hunspell dictionaries.
 *   German : igerman98 via `dictionary-de` (GPL-2.0 OR GPL-3.0)
 *   English: SCOWL    via `dictionary-en` (MIT AND BSD)
 * Output: src/games/wordle/data/words-{de,en}.ts (one fixed-width string per language).
 * Run: npm run build:wordle-words   (devDependencies only; output is committed)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src/games/wordle/data');

/** Same folding as wordleEngine.normalizeWord (lists must hold what the keyboard can type). */
const fold = (w) =>
  w.toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS');

function parseAff(text) {
  const opts = {};
  const rules = []; // { type, flag, strip, add, cont, re, cross }
  const lines = text.split('\n');
  const cross = {}; // "PFX a" -> true when the header says Y
  for (const line of lines) {
    const p = line.split('#')[0].trim().split(/\s+/);
    if ((p[0] === 'PFX' || p[0] === 'SFX') && p.length === 4)
      cross[`${p[0]} ${p[1]}`] = p[2] === 'Y';
  }
  for (const line of lines) {
    const p = line.split('#')[0].trim().split(/\s+/);
    if (p[0] === 'PFX' || p[0] === 'SFX') {
      if (p.length <= 4) continue; // header line: type flag cross count
      const [type, flag, strip, addRaw, cond = '.'] = p;
      const [add, cont = ''] = addRaw.split('/');
      const re = new RegExp(type === 'PFX' ? `^${cond}` : `${cond}$`, 'u');
      rules.push({
        type,
        flag,
        strip: strip === '0' ? '' : strip,
        add: add === '0' ? '' : add,
        cont,
        re,
        cross: cross[`${type} ${flag}`] ?? false,
      });
    } else if (p[0] && p.length === 2) {
      opts[p[0]] = p[1];
    }
  }
  return { opts, rules };
}

function applyRule(word, r) {
  if (!r.re.test(word)) return null;
  if (r.type === 'PFX') {
    if (r.strip && !word.startsWith(r.strip)) return null;
    return r.add + word.slice(r.strip.length);
  }
  if (r.strip && !word.endsWith(r.strip)) return null;
  return word.slice(0, word.length - r.strip.length) + r.add;
}

function expand(dic, aff, { keep }) {
  const { opts, rules } = aff;
  const byFlag = new Map();
  for (const r of rules) {
    if (!byFlag.has(r.flag)) byFlag.set(r.flag, []);
    byFlag.get(r.flag).push(r);
  }
  const only = opts.ONLYINCOMPOUND;
  const forbidden = opts.FORBIDDENWORD;
  const needAffix = opts.NEEDAFFIX;
  const out = new Set();
  const emit = (w) => {
    const f = fold(w);
    if (/^[A-Z]{5}$/.test(f)) out.add(f);
  };

  for (const line of dic.split('\n').slice(1)) {
    const [stem, flagStr = ''] = line.trim().split(/\s/)[0].split('/');
    if (!stem || !keep(stem)) continue;
    const flags = [...flagStr];
    if (forbidden && flags.includes(forbidden)) continue;
    if (only && flags.includes(only)) continue;
    if (!(needAffix && flags.includes(needAffix))) emit(stem);

    const forms = [];
    for (const f of flags) {
      for (const r of byFlag.get(f) ?? []) {
        const w = applyRule(stem, r);
        if (w === null) continue;
        const contFlags = [...r.cont];
        if (only && contFlags.includes(only)) continue;
        if (forbidden && contFlags.includes(forbidden)) continue;
        if (!(needAffix && contFlags.includes(needAffix))) emit(w);
        forms.push({ w, r, contFlags });
      }
    }
    // Continuation (second-level) affixes and prefix x suffix cross products.
    for (const { w, r, contFlags } of forms) {
      for (const f of contFlags) {
        for (const r2 of byFlag.get(f) ?? []) {
          const w2 = applyRule(w, r2);
          if (w2 === null || (only && [...r2.cont].includes(only))) continue;
          emit(w2);
        }
      }
      if (!r.cross) continue;
      for (const f of flags) {
        for (const r2 of byFlag.get(f) ?? []) {
          if (r2.type === r.type || !r2.cross) continue;
          const w2 = applyRule(w, r2);
          if (w2 === null || (only && [...r2.cont].includes(only))) continue;
          emit(w2);
        }
      }
    }
  }
  return [...out].sort();
}

const TARGETS = [
  {
    lang: 'de',
    pkg: 'dictionary-de',
    // German nouns are capitalised; all entries are kept (proper names cannot be told apart).
    keep: () => true,
    source: 'igerman98 (Bjoern Jacke), GPL-2.0 OR GPL-3.0, via npm "dictionary-de"',
  },
  {
    lang: 'en',
    pkg: 'dictionary-en',
    // Drop proper nouns and acronyms (stems starting upper-case).
    keep: (stem) => /^[a-z]/.test(stem),
    source: 'SCOWL (Kevin Atkinson), MIT AND BSD, via npm "dictionary-en"',
  },
];

for (const t of TARGETS) {
  const dir = dirname(require.resolve(t.pkg));
  const version = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
  const aff = parseAff(readFileSync(join(dir, 'index.aff'), 'utf8'));
  const words = expand(readFileSync(join(dir, 'index.dic'), 'utf8'), aff, t);
  const name = `${t.lang.toUpperCase()}_WORDS`;
  const body = `// GENERATED by scripts/build-wordle-words.mjs (npm run build:wordle-words). Do not edit.
// Source: ${t.source} v${version}. See ./README.md for licence and attribution.
// ${words.length} unique 5-letter words, A-Z, sorted, concatenated without separators.
export const ${name} =
  '${words.join('')}';
`;
  writeFileSync(join(OUT_DIR, `words-${t.lang}.ts`), body);
  console.log(`${t.lang}: ${words.length} words (${t.pkg}@${version})`);
}
