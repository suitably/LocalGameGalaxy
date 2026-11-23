/**
 * Dependency licence checks for the AGPL-3.0-or-later project (#594).
 * Pure helpers: the CLI (`scripts/check-licences.mjs`) reads the lockfiles and licence files.
 */

/** Licences whose code may ship in an AGPL-3.0-or-later work (SPDX ids). */
export const ALLOWED_LICENCES = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'Apache-2.0',
  'MPL-2.0',
  'CC0-1.0',
  'CC-BY-4.0',
  'Unlicense',
  'Python-2.0',
  'BlueOak-1.0.0',
  // LGPL 2.x may be relicensed to GPL-2.0-or-later (LGPL-2.1 §3), so it combines with AGPL-3.0.
  'LGPL-2.0-or-later',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'GPL-2.0-or-later',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  // Permissive; the FSF lists the zlib licence as GPL-compatible (pako: "MIT AND Zlib").
  'Zlib',
  // Permissive; the FSF lists the WTFPL as GPL-compatible (server: truncate-utf8-bytes).
  'WTFPL',
  // Fonts (@fontsource-variable/*): OFL-1.1 explicitly allows bundling with any software;
  // the font files keep their own licence and are never relicensed.
  'OFL-1.1',
]);

/** Non-SPDX spellings found in package metadata, mapped to their SPDX id. */
export const LICENCE_ALIASES = {
  'MPL 2.0': 'MPL-2.0', // node-datachannel (LICENSE file: Mozilla Public License Version 2.0)
};

/**
 * Packages whose lockfile entry has no usable licence; keyed by name@version so a new version
 * is reviewed again. Each value was read from the package itself.
 */
export const LICENCE_OVERRIDES = {
  'fuzzy@0.1.3': 'MIT', // legacy `licenses: [{ type: 'MIT' }]`, LICENSE-MIT (Matt York)
  'khroma@2.1.0': 'MIT', // `license` file: The MIT License (Fabio Spampinato, Andrew Maney)
  'compact2string@1.4.1': 'MIT', // package.json says "BSD"; README "Licence: (MIT Licence)"
};

/** Splits an SPDX expression into tokens. */
function tokenize(expression) {
  return expression.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/).filter(Boolean);
}

/**
 * Parses an SPDX licence expression (`AND`, `OR`, `WITH`, parentheses; AND binds tighter).
 * @returns {{ type: 'id', id: string } | { type: 'and' | 'or', left: object, right: object }}
 */
export function parseSpdx(expression) {
  const tokens = tokenize(String(expression));
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (tok, op) => typeof tok === 'string' && tok.toUpperCase() === op;

  function primary() {
    const tok = tokens[pos++];
    if (tok === undefined) throw new Error(`Unexpected end of licence expression "${expression}"`);
    if (tok === '(') {
      const node = orExpr();
      if (tokens[pos++] !== ')') throw new Error(`Missing ")" in "${expression}"`);
      return node;
    }
    if (tok === ')' || isOp(tok, 'AND') || isOp(tok, 'OR') || isOp(tok, 'WITH')) {
      throw new Error(`Unexpected "${tok}" in "${expression}"`);
    }
    let node = { type: 'id', id: tok };
    if (isOp(peek(), 'WITH')) {
      pos++;
      const exception = tokens[pos++];
      if (!exception) throw new Error(`Missing exception after WITH in "${expression}"`);
      node = { type: 'id', id: tok, exception };
    }
    return node;
  }
  function andExpr() {
    let left = primary();
    while (isOp(peek(), 'AND')) {
      pos++;
      left = { type: 'and', left, right: primary() };
    }
    return left;
  }
  function orExpr() {
    let left = andExpr();
    while (isOp(peek(), 'OR')) {
      pos++;
      left = { type: 'or', left, right: andExpr() };
    }
    return left;
  }
  const tree = orExpr();
  if (pos !== tokens.length) throw new Error(`Unexpected "${tokens[pos]}" in "${expression}"`);
  return tree;
}

/** True when the expression can be satisfied with allowed licences only. */
export function isLicenceAllowed(expression, allowed = ALLOWED_LICENCES) {
  if (typeof expression !== 'string' || expression.trim() === '') return false;
  const normalised = LICENCE_ALIASES[expression.trim()] ?? expression;
  let tree;
  try {
    tree = parseSpdx(normalised);
  } catch {
    return false;
  }
  const visit = (node) => {
    if (node.type === 'id') return allowed.has(LICENCE_ALIASES[node.id] ?? node.id);
    if (node.type === 'and') return visit(node.left) && visit(node.right);
    return visit(node.left) || visit(node.right);
  };
  return visit(tree);
}

/** Package name of a lockfile `packages` key (`node_modules/a/node_modules/@s/b` → `@s/b`). */
export function packageNameFromPath(path) {
  const idx = path.lastIndexOf('node_modules/');
  return idx === -1 ? path : path.slice(idx + 'node_modules/'.length);
}

/**
 * Production packages of a lockfile v2/v3 (dev-only entries, links and the root are skipped).
 * @returns {{ path: string, name: string, version: string, license: string | null }[]}
 */
export function productionPackages(lock, overrides = LICENCE_OVERRIDES) {
  const result = [];
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path || entry.link || entry.dev) continue;
    const name = entry.name ?? packageNameFromPath(path);
    const version = entry.version ?? '';
    const raw = typeof entry.license === 'string' ? entry.license : null;
    const license = overrides[`${name}@${version}`] ?? raw;
    result.push({ path, name, version, license });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
}

/** Packages whose licence is missing or not allowed. */
export function findViolations(packages, allowed = ALLOWED_LICENCES) {
  return packages.filter((pkg) => !isLicenceAllowed(pkg.license, allowed));
}

/**
 * Text of a THIRD_PARTY_LICENSES.txt file.
 * @param {string} title first line, e.g. "Nexumia server"
 * @param {{ name: string, version: string, license: string | null, path: string }[]} packages
 * @param {(pkg: object) => string | null} readLicenceText licence file contents, or null
 */
export function buildNotice(title, packages, readLicenceText) {
  const seen = new Set();
  const parts = [
    `${title} — third-party software notices`,
    '',
    'This software is licensed under the GNU Affero General Public License v3.0 or later',
    '(see LICENSE). It includes the following third-party packages under their own licences.',
  ];
  for (const pkg of packages) {
    const key = `${pkg.name}@${pkg.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const text = readLicenceText(pkg);
    parts.push(
      '',
      '-'.repeat(78),
      `${key}`,
      `License: ${pkg.license ?? 'UNKNOWN'}`,
      '-'.repeat(78),
      '',
      text ? text.trim() : '(The package ships no licence file; see its SPDX licence above.)',
    );
  }
  return `${parts.join('\n')}\n`;
}
