/**
 * Per-file line-coverage ratchet for the logic/ folders under src/ (#850).
 * Baseline = line coverage per file, rounded down to whole percent.
 */

export const MAX_DROP = 2;
export const NEW_FILE_MIN_LINES = 30;
export const NEW_FILE_MIN_PCT = 60;

const LOGIC_FILE = /^src\/(?:.*\/)?logic\/.*\.ts$/;

/**
 * @param {string} rel repository-relative POSIX path
 * @returns {boolean} true for non-test, non-declaration .ts files under a logic/ folder
 */
export function isLogicFile(rel) {
  return LOGIC_FILE.test(rel) && !/\.(test|spec)\.ts$/.test(rel) && !rel.endsWith('.d.ts');
}

/**
 * @param {Record<string, { lines: { total: number, covered: number } }>} summary
 *   vitest `json-summary` content (keys: "total" and absolute or relative file paths)
 * @param {string} rootDir absolute repository root
 * @returns {Record<string, { total: number, pct: number }>} logic file -> line count and floored percent
 */
export function logicCoverage(summary, rootDir) {
  const prefix = rootDir.endsWith('/') ? rootDir : `${rootDir}/`;
  const out = {};
  for (const [key, entry] of Object.entries(summary)) {
    if (key === 'total') continue;
    const normalized = key.replace(/\\/g, '/');
    const rel = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
    if (!isLogicFile(rel)) continue;
    const { total, covered } = entry.lines;
    out[rel] = { total, pct: total === 0 ? 100 : Math.floor((covered / total) * 100) };
  }
  return out;
}

/**
 * @param {Record<string, { total: number, pct: number }>} current
 * @param {Record<string, number>} baseline file -> percent
 * @returns {{ dropped: Array<{ file: string, baseline: number, current: number }>,
 *             weakNew: Array<{ file: string, lines: number, current: number }>,
 *             missing: string[] }}
 */
export function compareCoverage(current, baseline) {
  const dropped = [];
  const weakNew = [];
  for (const [file, { total, pct }] of Object.entries(current)) {
    if (file in baseline) {
      if (pct < baseline[file] - MAX_DROP) {
        dropped.push({ file, baseline: baseline[file], current: pct });
      }
    } else if (total >= NEW_FILE_MIN_LINES && pct < NEW_FILE_MIN_PCT) {
      weakNew.push({ file, lines: total, current: pct });
    }
  }
  const missing = Object.keys(baseline).filter((file) => !(file in current));
  const byFile = (a, b) => a.file.localeCompare(b.file);
  return { dropped: dropped.sort(byFile), weakNew: weakNew.sort(byFile), missing: missing.sort() };
}

/**
 * Baseline for `--update`: every current logic file at its current percent.
 * @param {Record<string, { total: number, pct: number }>} current
 * @returns {Record<string, number>}
 */
export function buildBaseline(current) {
  return Object.fromEntries(
    Object.entries(current)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, { pct }]) => [file, pct]),
  );
}
