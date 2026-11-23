/**
 * Dead-code ratchet on top of `knip --reporter json` (#841). Every issue is counted per
 * "<category>:<file>" (e.g. "exports:src/lib/foo.ts"); a count may never rise above its baseline.
 * A count below its baseline passes and is reported as stale (`--update` lowers it).
 */

/** Issue categories that are held by the ratchet. */
export const CATEGORIES = [
  'files',
  'dependencies',
  'devDependencies',
  'optionalPeerDependencies',
  'unlisted',
  'unresolved',
  'exports',
  'types',
  'enumMembers',
  'namespaceMembers',
  'duplicates',
  'catalog',
];

/**
 * @param {{ issues?: Array<Record<string, unknown>> }} report knip JSON report
 * @returns {Record<string, number>} "<category>:<file>" -> issue count (only non-zero)
 */
export function countIssues(report) {
  const counts = {};
  for (const issue of report.issues ?? []) {
    const file = String(issue.file).replace(/\\/g, '/');
    for (const category of CATEGORIES) {
      const value = issue[category];
      const n = Array.isArray(value) ? value.length : value === true ? 1 : 0;
      if (n > 0) counts[`${category}:${file}`] = n;
    }
  }
  return counts;
}

/**
 * @param {Record<string, number>} current
 * @param {Record<string, number>} baseline
 * @returns {{ increased: Array<{ key: string, baseline: number, current: number }>,
 *             stale: Array<{ key: string, baseline: number, current: number }> }}
 */
export function compareToBaseline(current, baseline) {
  const increased = [];
  const stale = [];
  for (const [key, count] of Object.entries(current)) {
    const allowed = baseline[key] ?? 0;
    if (count > allowed) increased.push({ key, baseline: allowed, current: count });
  }
  for (const [key, allowed] of Object.entries(baseline)) {
    const count = current[key] ?? 0;
    if (count < allowed) stale.push({ key, baseline: allowed, current: count });
  }
  const byKey = (a, b) => a.key.localeCompare(b.key);
  return { increased: increased.sort(byKey), stale: stale.sort(byKey) };
}

/**
 * Baseline for `--update`: never raises a count and drops entries that reached zero.
 * @param {Record<string, number>} current
 * @param {Record<string, number>} baseline
 * @returns {Record<string, number>}
 */
export function lowerBaseline(current, baseline) {
  const out = {};
  for (const [key, allowed] of Object.entries(baseline)) {
    const count = Math.min(current[key] ?? 0, allowed);
    if (count > 0) out[key] = count;
  }
  return out;
}

/**
 * @param {Record<string, number>} counts
 * @returns {Record<string, number>} keys sorted
 */
export function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * @param {Record<string, number>} counts
 * @returns {Record<string, number>} total per category
 */
export function totalsByCategory(counts) {
  const totals = {};
  for (const [key, n] of Object.entries(counts)) {
    const category = key.slice(0, key.indexOf(':'));
    totals[category] = (totals[category] ?? 0) + n;
  }
  return totals;
}
