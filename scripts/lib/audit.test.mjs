import test from 'node:test';
import assert from 'node:assert/strict';
import { advisoryId, collectAdvisories, evaluateAdvisories, parseAllowlist } from './audit.mjs';

const report = {
  auditReportVersion: 2,
  vulnerabilities: {
    ip: {
      name: 'ip',
      severity: 'high',
      via: [
        {
          source: 1101851,
          name: 'ip',
          title: 'ip SSRF improper categorization in isPublic',
          url: 'https://github.com/advisories/GHSA-2p57-rm9w-gvfp',
          severity: 'high',
        },
      ],
    },
    'bittorrent-tracker': { name: 'bittorrent-tracker', severity: 'high', via: ['ip'] },
    katex: {
      name: 'katex',
      severity: 'low',
      via: [
        {
          source: 1,
          name: 'katex',
          url: 'https://github.com/advisories/GHSA-238p-pmpm-9mq7',
          severity: 'low',
        },
      ],
    },
    nanoid: {
      name: 'nanoid',
      severity: 'critical',
      via: [
        {
          source: 7,
          name: 'nanoid',
          url: 'https://github.com/advisories/GHSA-28wg-ghj8-5hjv',
          severity: 'critical',
        },
        {
          source: 8,
          name: 'nanoid',
          url: 'https://github.com/advisories/GHSA-28wg-ghj8-5hjv',
          severity: 'critical',
        },
      ],
    },
  },
};

test('advisoryId prefers the GHSA id and falls back to the npm source number', () => {
  assert.equal(
    advisoryId({ url: 'https://github.com/advisories/GHSA-2p57-rm9w-gvfp', source: 1 }),
    'GHSA-2p57-rm9w-gvfp',
  );
  assert.equal(advisoryId({ source: 42 }), '42');
});

test('collectAdvisories keeps high and critical advisory objects, deduplicated', () => {
  const found = collectAdvisories(report, { project: 'server' });
  assert.deepEqual(
    found.map((a) => [a.id, a.package, a.severity, a.project]),
    [
      ['GHSA-28wg-ghj8-5hjv', 'nanoid', 'critical', 'server'],
      ['GHSA-2p57-rm9w-gvfp', 'ip', 'high', 'server'],
    ],
  );
  assert.equal(collectAdvisories(report, { minSeverity: 'critical' }).length, 1);
});

test('collectAdvisories rejects npm errors and unknown report formats', () => {
  assert.throws(() => collectAdvisories({ error: { code: 'ENOLOCK' } }), /npm audit failed/);
  assert.throws(() => collectAdvisories({ advisories: {} }), /auditReportVersion 2/);
});

test('parseAllowlist requires id, reason and an expiry date', () => {
  assert.deepEqual(parseAllowlist({ advisories: [] }), { entries: [], errors: [] });
  const { errors } = parseAllowlist({
    advisories: [{ id: 'GHSA-x', reason: 'short', expires: '2026-13' }],
  });
  assert.equal(errors.length, 2);
  assert.match(parseAllowlist({}).errors[0], /advisories/);
});

test('evaluateAdvisories blocks unlisted and expired advisories', () => {
  const advisories = collectAdvisories(report);
  const { entries } = parseAllowlist({
    advisories: [
      {
        id: 'GHSA-2p57-rm9w-gvfp',
        package: 'ip',
        reason: 'isPublic() is never called',
        expires: '2026-12-31',
      },
      {
        id: 'GHSA-28wg-ghj8-5hjv',
        reason: 'accepted until the excalidraw bump',
        expires: '2026-10-01',
      },
      { id: 'GHSA-unused', reason: 'stale entry for a fixed advisory', expires: '2027-01-01' },
    ],
  });
  const result = evaluateAdvisories(advisories, entries, '2026-10-27');
  assert.deepEqual(
    result.allowed.map((a) => a.id),
    ['GHSA-2p57-rm9w-gvfp'],
  );
  assert.deepEqual(
    result.blocking.map((a) => a.id),
    ['GHSA-28wg-ghj8-5hjv'],
  );
  assert.deepEqual(
    result.expiredMatches.map((a) => a.expires),
    ['2026-10-01'],
  );
  assert.deepEqual(
    result.unused.map((e) => e.id),
    ['GHSA-unused'],
  );
});

test('an allow-list entry still counts on its expiry day and a package mismatch does not match', () => {
  const advisories = collectAdvisories(report, { minSeverity: 'critical' });
  const sameDay = evaluateAdvisories(
    advisories,
    [{ id: 'GHSA-28wg-ghj8-5hjv', reason: 'accepted for now', expires: '2026-10-27' }],
    '2026-10-27',
  );
  assert.equal(sameDay.blocking.length, 0);
  const otherPackage = evaluateAdvisories(
    advisories,
    [
      {
        id: 'GHSA-28wg-ghj8-5hjv',
        package: 'other',
        reason: 'accepted for now',
        expires: '2027-01-01',
      },
    ],
    '2026-10-27',
  );
  assert.equal(otherPackage.blocking.length, 1);
});
