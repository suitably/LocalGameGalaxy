/**
 * Changelog and docs-log fragments (#593). Pure functions; scripts/changelog.mjs does the I/O.
 *
 * - `changelog.d/<slug>.<type>.md` → one or more bullets for CHANGELOG.md.
 * - `docs/log.d/<YYYY-MM-DD>-<slug>.md` → one `## YYYY-MM-DD — summary (agent)` entry for docs/log.md.
 */

/** Fragment type → CHANGELOG heading and the semver part it bumps. */
export const FRAGMENT_TYPES = {
  added: { heading: 'Added', bump: 'minor' },
  changed: { heading: 'Changed', bump: 'minor' },
  deprecated: { heading: 'Deprecated', bump: 'minor' },
  removed: { heading: 'Removed', bump: 'minor' },
  fixed: { heading: 'Fixed', bump: 'patch' },
  security: { heading: 'Security', bump: 'patch' },
};

/** Section order in a release. `Refactored` only comes from hand-written [Unreleased] entries. */
export const CATEGORY_ORDER = [
  'Added',
  'Changed',
  'Deprecated',
  'Refactored',
  'Removed',
  'Fixed',
  'Security',
];

/** Bump for headings written by hand under [Unreleased] before fragments existed. */
const LEGACY_HEADING_BUMP = { Refactored: 'patch' };

export const IGNORED_FILES = new Set(['README.md', '.gitkeep']);

const BUMP_RANK = { patch: 1, minor: 2, major: 3 };
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const FRAGMENT_RE = new RegExp(
  `^([a-z0-9][a-z0-9._-]*)\\.(${Object.keys(FRAGMENT_TYPES).join('|')})\\.md$`,
);
const LOG_FRAGMENT_RE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9][a-z0-9-]*)\.md$/;
const LOG_HEADING_RE = /^## (\d{4}-\d{2}-\d{2}) — .+ \(.+\)$/;
const UNRELEASED_RE = /^## \[Unreleased\][^\n]*$/m;

// ---------------------------------------------------------------------------
// Versions

/** @param {string} version */
export function parseVersion(version) {
  const m = SEMVER_RE.exec(String(version).trim());
  if (!m) throw new Error(`not a version (X.Y.Z): ${version}`);
  return m.slice(1).map(Number);
}

/** @returns {number} negative, zero or positive like a sort comparator */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** @param {'major' | 'minor' | 'patch'} bump */
export function incrementVersion(version, bump) {
  const [major, minor, patch] = parseVersion(version);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw new Error(`unknown bump: ${bump}`);
}

/**
 * Largest bump implied by fragment types and hand-written [Unreleased] headings.
 * @param {string[]} types fragment types
 * @param {string[]} [legacyHeadings]
 * @returns {'major' | 'minor' | 'patch' | null} null = nothing to release
 */
export function bumpFor(types, legacyHeadings = []) {
  let best = null;
  const consider = (bump) => {
    if (bump && (!best || BUMP_RANK[bump] > BUMP_RANK[best])) best = bump;
  };
  for (const t of types) consider(FRAGMENT_TYPES[t]?.bump);
  for (const h of legacyHeadings) {
    const type = Object.values(FRAGMENT_TYPES).find((f) => f.heading === h);
    consider(type?.bump ?? LEGACY_HEADING_BUMP[h] ?? 'minor');
  }
  return best;
}

/**
 * Next release version: an exact override wins, then an explicit bump, else the fragment types.
 * @param {{ current: string, types: string[], legacyHeadings?: string[],
 *           bump?: 'auto' | 'major' | 'minor' | 'patch', override?: string }} input
 * @returns {string | null} null when there is nothing to release
 */
export function nextVersion({ current, types, legacyHeadings = [], bump = 'auto', override }) {
  const implied = bumpFor(types, legacyHeadings);
  if (!implied) return null;
  if (override) {
    if (compareVersions(override, current) <= 0) {
      throw new Error(`version ${override} is not greater than the current version ${current}`);
    }
    return override;
  }
  return incrementVersion(current, bump === 'auto' || !bump ? implied : bump);
}

// ---------------------------------------------------------------------------
// Changelog fragments

/** @returns {{ slug: string, type: string } | null} */
export function parseFragmentName(name) {
  const m = FRAGMENT_RE.exec(name);
  return m ? { slug: m[1], type: m[2] } : null;
}

/** Fragment text as markdown bullets: a body without a leading bullet becomes one. */
export function fragmentBullets(content) {
  const text = content.replace(/\r\n/g, '\n').trim();
  return /^[-*] /.test(text) ? text : `- ${text}`;
}

/** @returns {string[]} problems, empty when the fragment is valid */
export function validateFragment(name, content) {
  const errors = [];
  if (!parseFragmentName(name)) {
    errors.push(
      `${name}: name must be <slug>.<${Object.keys(FRAGMENT_TYPES).join('|')}>.md (lowercase slug)`,
    );
  }
  const text = content.trim();
  if (!text) errors.push(`${name}: is empty`);
  if (/^#{1,6} /m.test(text)) errors.push(`${name}: must not contain headings, only bullet text`);
  if (/^## \[/m.test(text) || /^<<<<<<<|^>>>>>>>/m.test(text)) {
    errors.push(`${name}: contains a release heading or conflict marker`);
  }
  return errors;
}

/**
 * Locates `## [Unreleased]` and parses its `### Heading` blocks.
 * @returns {{ start: number, end: number, categories: Map<string, string> }}
 */
export function parseUnreleased(changelog) {
  const m = UNRELEASED_RE.exec(changelog);
  if (!m) throw new Error('CHANGELOG.md has no "## [Unreleased]" heading');
  const bodyStart = m.index + m[0].length;
  const next = changelog.slice(bodyStart).search(/^## /m);
  const end = next === -1 ? changelog.length : bodyStart + next;
  const categories = new Map();
  let current = null;
  for (const line of changelog.slice(bodyStart, end).split('\n')) {
    const h = /^### (.+?)\s*$/.exec(line);
    if (h) {
      current = h[1];
      if (!categories.has(current)) categories.set(current, []);
    } else if (current) {
      categories.get(current).push(line);
    }
  }
  const trimmed = new Map();
  for (const [heading, lines] of categories) {
    const text = lines.join('\n').trim();
    if (text) trimmed.set(heading, text);
  }
  return { start: m.index, end, categories: trimmed };
}

/** Orders category headings: known ones first in CATEGORY_ORDER, unknown ones after. */
function orderHeadings(headings) {
  const rank = (h) => {
    const i = CATEGORY_ORDER.indexOf(h);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...headings].sort((a, b) => rank(a) - rank(b));
}

/**
 * Release section from hand-written [Unreleased] entries plus fragments.
 * @param {Map<string, string>} legacy heading → bullets
 * @param {Array<{ type: string, content: string }>} fragments sorted by name
 */
export function buildCategories(legacy, fragments) {
  const blocks = new Map();
  for (const [heading, text] of legacy) blocks.set(heading, [text]);
  for (const f of fragments) {
    const heading = FRAGMENT_TYPES[f.type].heading;
    if (!blocks.has(heading)) blocks.set(heading, []);
    blocks.get(heading).push(fragmentBullets(f.content));
  }
  return orderHeadings(blocks.keys()).map((heading) => ({
    heading,
    text: blocks.get(heading).join('\n'),
  }));
}

/**
 * Writes `## [version] - date` below an emptied `## [Unreleased]`.
 * @param {string} changelog
 * @param {Array<{ type: string, content: string }>} fragments
 */
export function collectChangelog(changelog, fragments, version, date) {
  parseVersion(version);
  if (new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm').test(changelog)) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }
  const { start, end, categories } = parseUnreleased(changelog);
  const blocks = buildCategories(categories, fragments);
  if (blocks.length === 0)
    throw new Error('nothing to collect: no fragments and no [Unreleased] entries');
  const section = [
    `## [${version}] - ${date}`,
    '',
    ...blocks.flatMap((b) => [`### ${b.heading}`, '', b.text, '']),
  ].join('\n');
  const rest = changelog.slice(end);
  const tail = rest ? `${section}\n${rest}` : section;
  return `${changelog.slice(0, start)}## [Unreleased]\n\n${tail}`;
}

/** Body of the `## [version]` section (without its heading), or null. */
export function extractNotes(changelog, version) {
  const re = new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*\\n`, 'm');
  const m = re.exec(changelog);
  if (!m) return null;
  const rest = changelog.slice(m.index + m[0].length);
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

// ---------------------------------------------------------------------------
// Version fields

function detectIndent(text) {
  const m = /^\{\n([ \t]+)"/.exec(text);
  return m ? m[1] : 2;
}

/** package.json: sets "version". */
export function bumpPackageJson(text, version) {
  const data = JSON.parse(text);
  data.version = version;
  return `${JSON.stringify(data, null, detectIndent(text))}\n`;
}

/** package-lock.json: sets the root "version" and packages[""].version. */
export function bumpLockfile(text, version) {
  const data = JSON.parse(text);
  data.version = version;
  if (data.packages?.['']) data.packages[''].version = version;
  return `${JSON.stringify(data, null, detectIndent(text))}\n`;
}

/** android/app/build.gradle: versionName = version, versionCode + 1. */
export function bumpGradle(text, version) {
  const code = /versionCode\s+(\d+)/.exec(text);
  if (!code || !/versionName\s+"[^"]*"/.test(text)) {
    throw new Error('build.gradle has no versionCode / versionName');
  }
  return text
    .replace(/versionCode\s+\d+/, `versionCode ${Number(code[1]) + 1}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
}

export function readGradleVersionName(text) {
  return /versionName\s+"([^"]*)"/.exec(text)?.[1] ?? null;
}

/**
 * Checks that every version field and the changelog agree with `version` (tag without "v").
 * @param {{ packages: Record<string, string>, gradleVersionName: string | null, changelog: string }} state
 * @returns {string[]} problems
 */
export function verifyRelease(state, version) {
  const errors = [];
  for (const [file, v] of Object.entries(state.packages)) {
    if (v !== version) errors.push(`${file} has version ${v}, expected ${version}`);
  }
  if (state.gradleVersionName !== version) {
    errors.push(
      `android/app/build.gradle versionName is ${state.gradleVersionName}, expected ${version}`,
    );
  }
  if (!extractNotes(state.changelog, version))
    errors.push(`CHANGELOG.md has no "## [${version}]" section`);
  return errors;
}

// ---------------------------------------------------------------------------
// docs/log.d fragments

/** @returns {{ date: string, slug: string } | null} */
export function parseLogFragmentName(name) {
  const m = LOG_FRAGMENT_RE.exec(name);
  return m ? { date: m[1], slug: m[2] } : null;
}

/** @returns {string[]} problems, empty when the fragment is valid */
export function validateLogFragment(name, content) {
  const parsed = parseLogFragmentName(name);
  if (!parsed) return [`${name}: name must be YYYY-MM-DD-<slug>.md (lowercase slug)`];
  const lines = content.replace(/\r\n/g, '\n').trim().split('\n');
  const heading = LOG_HEADING_RE.exec(lines[0] ?? '');
  const errors = [];
  if (!heading) {
    errors.push(`${name}: first line must be "## YYYY-MM-DD — summary (agent)"`);
  } else if (heading[1] !== parsed.date) {
    errors.push(
      `${name}: heading date ${heading[1]} differs from the file name date ${parsed.date}`,
    );
  }
  if (!lines.slice(1).some((l) => /^- \S/.test(l)))
    errors.push(`${name}: needs at least one "- " bullet`);
  if (lines.slice(1).some((l) => /^#{1,2} /.test(l))) {
    errors.push(`${name}: holds one entry; split further "## " headings into their own fragments`);
  }
  return errors;
}

/**
 * Inserts log fragments above the newest entry, newest file name first.
 * @param {string} log docs/log.md
 * @param {Array<{ name: string, content: string }>} fragments
 */
export function collectLog(log, fragments) {
  if (fragments.length === 0) return log;
  const first = log.search(/^## /m);
  const at = first === -1 ? log.length : first;
  const entries = [...fragments]
    .sort((a, b) => b.name.localeCompare(a.name))
    .map((f) => `${f.content.replace(/\r\n/g, '\n').trim()}\n\n`)
    .join('');
  const head = log.slice(0, at);
  const sep = head === '' || head.endsWith('\n\n') ? '' : head.endsWith('\n') ? '\n' : '\n\n';
  const rest = log.slice(at);
  return rest ? `${head}${sep}${entries}${rest}` : `${head}${sep}${entries.trimEnd()}\n`;
}
