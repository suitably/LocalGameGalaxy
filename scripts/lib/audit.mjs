/**
 * Production dependency audit with an allow-list (#592).
 *
 * Pure functions: they take an `npm audit --json` report (auditReportVersion 2) and the parsed
 * `scripts/audit-allowlist.json`, and decide which advisories block a release.
 */

export const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Advisory id: the GHSA id from the advisory URL, otherwise the npm advisory number.
 * @param {{ url?: string, source?: number | string }} via
 */
export function advisoryId(via) {
  const match =
    typeof via.url === 'string' ? via.url.match(/GHSA(-[23456789cfghjmpqrvwx]{4}){3}/) : null;
  if (match) return match[0];
  return via.source !== undefined ? String(via.source) : 'unknown';
}

/**
 * Collects the advisories at or above `minSeverity` from an npm audit report.
 * Only advisory objects in `via` count; string entries just point to another vulnerable package.
 * @param {unknown} report parsed `npm audit --json` output
 * @param {{ minSeverity?: keyof SEVERITY_RANK, project?: string }} [options]
 * @returns {Array<{ id: string, package: string, severity: string, title: string, url: string, project: string }>}
 */
export function collectAdvisories(report, { minSeverity = 'high', project = '.' } = {}) {
  if (!report || typeof report !== 'object') throw new Error('audit report is not an object');
  const { vulnerabilities, error } = /** @type {Record<string, unknown>} */ (report);
  if (error) throw new Error(`npm audit failed: ${JSON.stringify(error)}`);
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    throw new Error('audit report has no "vulnerabilities" object (expected auditReportVersion 2)');
  }
  const min = SEVERITY_RANK[minSeverity];
  const found = new Map();
  for (const [name, vuln] of Object.entries(vulnerabilities)) {
    const via = Array.isArray(vuln?.via) ? vuln.via : [];
    for (const entry of via) {
      if (!entry || typeof entry !== 'object') continue;
      const severity = String(entry.severity ?? 'info');
      if ((SEVERITY_RANK[severity] ?? 0) < min) continue;
      const pkg = String(entry.name ?? name);
      const id = advisoryId(entry);
      const key = `${id}|${pkg}`;
      if (!found.has(key)) {
        found.set(key, {
          id,
          package: pkg,
          severity,
          title: String(entry.title ?? ''),
          url: String(entry.url ?? ''),
          project,
        });
      }
    }
  }
  return [...found.values()].sort(
    (a, b) => a.id.localeCompare(b.id) || a.package.localeCompare(b.package),
  );
}

/**
 * Validates the allow-list file content.
 * @param {unknown} data
 * @returns {{ entries: Array<{ id: string, package?: string, reason: string, expires: string }>, errors: string[] }}
 */
export function parseAllowlist(data) {
  const errors = [];
  const list =
    data && typeof data === 'object'
      ? /** @type {{ advisories?: unknown }} */ (data).advisories
      : undefined;
  if (!Array.isArray(list))
    return { entries: [], errors: ['allow-list needs an "advisories" array'] };
  const entries = [];
  list.forEach((entry, index) => {
    const where = `advisories[${index}]`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${where} is not an object`);
      return;
    }
    const { id, reason, expires } = entry;
    if (typeof id !== 'string' || !id.trim()) errors.push(`${where}.id is missing`);
    if (typeof reason !== 'string' || reason.trim().length < 10) {
      errors.push(`${where}.reason must explain why the advisory is accepted (10+ characters)`);
    }
    if (
      typeof expires !== 'string' ||
      !DATE_RE.test(expires) ||
      Number.isNaN(Date.parse(expires))
    ) {
      errors.push(`${where}.expires must be a date (YYYY-MM-DD)`);
    }
    if (entry.package !== undefined && typeof entry.package !== 'string') {
      errors.push(`${where}.package must be a string when set`);
    }
    entries.push(entry);
  });
  return { entries: errors.length ? [] : entries, errors };
}

/**
 * Splits advisories into blocking and allowed ones. An entry stops counting the day after `expires`.
 * @param {ReturnType<typeof collectAdvisories>} advisories
 * @param {ReturnType<typeof parseAllowlist>['entries']} entries
 * @param {string} today YYYY-MM-DD
 */
export function evaluateAdvisories(advisories, entries, today) {
  const blocking = [];
  const allowed = [];
  const expiredMatches = [];
  const used = new Set();
  for (const advisory of advisories) {
    const matches = entries.filter(
      (e) => e.id === advisory.id && (!e.package || e.package === advisory.package),
    );
    const active = matches.find((e) => e.expires >= today);
    if (active) {
      used.add(active);
      allowed.push({ ...advisory, reason: active.reason, expires: active.expires });
      continue;
    }
    for (const m of matches) {
      used.add(m);
      expiredMatches.push({ ...advisory, expires: m.expires });
    }
    blocking.push(advisory);
  }
  const unused = entries.filter((e) => !used.has(e));
  return { blocking, allowed, expiredMatches, unused };
}
