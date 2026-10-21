/**
 * Per-file ESLint warning ratchet: a file may never have more warnings than its baseline,
 * and a baseline that is higher than the current count is stale and must be lowered.
 */

/**
 * @param {Array<{ filePath: string, warningCount: number }>} results ESLint results
 * @param {string} rootDir absolute repository root
 * @returns {Record<string, number>} relative POSIX path -> warning count (only files with warnings)
 */
export function countWarnings(results, rootDir) {
  const counts = {};
  const prefix = rootDir.endsWith('/') ? rootDir : `${rootDir}/`;
  for (const { filePath, warningCount } of results) {
    if (!warningCount) continue;
    const normalized = filePath.replace(/\\/g, '/');
    const rel = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
    counts[rel] = warningCount;
  }
  return counts;
}

/**
 * @param {Record<string, number>} current
 * @param {Record<string, number>} baseline
 * @returns {{ increased: Array<{ file: string, baseline: number, current: number }>,
 *             stale: Array<{ file: string, baseline: number, current: number }> }}
 */
export function compareToBaseline(current, baseline) {
  const increased = [];
  const stale = [];

  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file] ?? 0;
    if (count > allowed) increased.push({ file, baseline: allowed, current: count });
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    const count = current[file] ?? 0;
    if (count < allowed) stale.push({ file, baseline: allowed, current: count });
  }

  const byFile = (a, b) => a.file.localeCompare(b.file);
  return { increased: increased.sort(byFile), stale: stale.sort(byFile) };
}

/**
 * Baseline after `--update`: only lowers or removes entries, never raises them.
 * @param {Record<string, number>} current
 * @param {Record<string, number>} baseline
 * @returns {Record<string, number>}
 */
export function lowerBaseline(current, baseline) {
  const next = {};
  for (const file of Object.keys(baseline).sort()) {
    const count = Math.min(current[file] ?? 0, baseline[file]);
    if (count > 0) next[file] = count;
  }
  return next;
}

/**
 * @param {Record<string, number>} counts
 * @returns {Record<string, number>} counts with keys sorted, for a stable JSON file
 */
export function sortCounts(counts) {
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
