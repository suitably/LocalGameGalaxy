import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  bumpFor,
  bumpGradle,
  bumpLockfile,
  bumpPackageJson,
  collectChangelog,
  collectLog,
  compareVersions,
  extractNotes,
  fragmentBullets,
  incrementVersion,
  nextVersion,
  parseFragmentName,
  parseUnreleased,
  validateFragment,
  validateLogFragment,
  verifyRelease,
} from './changelog.mjs';

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'changelog.mjs');

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

### Added

- Old feature.

### Refactored

- Old refactor.

## [1.1.0] - 2026-09-02

### Added

- First release.
`;

test('versions: parse, compare, increment', () => {
  assert.equal(compareVersions('1.10.0', '1.9.9') > 0, true);
  assert.equal(compareVersions('1.2.0', '1.2.0'), 0);
  assert.equal(incrementVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(incrementVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(incrementVersion('1.2.3', 'major'), '2.0.0');
  assert.throws(() => incrementVersion('v1.2', 'patch'), /not a version/);
});

test('bumpFor: added/changed/removed → minor, fixed → patch, nothing → null', () => {
  assert.equal(bumpFor(['fixed']), 'patch');
  assert.equal(bumpFor(['fixed', 'added']), 'minor');
  assert.equal(bumpFor(['changed']), 'minor');
  assert.equal(bumpFor(['removed']), 'minor');
  assert.equal(bumpFor(['security']), 'patch');
  assert.equal(bumpFor([]), null);
  assert.equal(bumpFor([], ['Refactored']), 'patch');
  assert.equal(bumpFor([], ['Added']), 'minor');
});

test('nextVersion: types, explicit bump, override', () => {
  assert.equal(nextVersion({ current: '1.2.0', types: ['fixed'] }), '1.2.1');
  assert.equal(nextVersion({ current: '1.2.0', types: ['added', 'fixed'] }), '1.3.0');
  assert.equal(nextVersion({ current: '1.2.0', types: ['fixed'], bump: 'major' }), '2.0.0');
  assert.equal(nextVersion({ current: '1.2.0', types: ['fixed'], override: '1.5.0' }), '1.5.0');
  assert.equal(nextVersion({ current: '1.2.0', types: [] }), null);
  assert.throws(
    () => nextVersion({ current: '1.2.0', types: ['fixed'], override: '1.2.0' }),
    /not greater/,
  );
});

test('fragment names and content', () => {
  assert.deepEqual(parseFragmentName('593-release-pr.added.md'), {
    slug: '593-release-pr',
    type: 'added',
  });
  assert.equal(parseFragmentName('Foo.added.md'), null);
  assert.equal(parseFragmentName('foo.improved.md'), null);
  assert.equal(fragmentBullets('Plain text\n'), '- Plain text');
  assert.equal(fragmentBullets('- A\n- B\n'), '- A\n- B');
  assert.deepEqual(validateFragment('x.fixed.md', '- ok'), []);
  assert.equal(validateFragment('x.fixed.md', '  ').length, 1);
  assert.equal(validateFragment('x.fixed.md', '### Fixed\n- a').length, 1);
  assert.equal(validateFragment('x.md', '- a').length, 1);
});

test('parseUnreleased reads hand-written categories', () => {
  const { categories } = parseUnreleased(CHANGELOG);
  assert.deepEqual([...categories.keys()], ['Added', 'Refactored']);
  assert.throws(() => parseUnreleased('# Changelog\n'), /Unreleased/);
});

test('collectChangelog merges legacy entries and fragments into a new section', () => {
  const out = collectChangelog(
    CHANGELOG,
    [
      { type: 'fixed', content: '- Bug fixed.\n' },
      { type: 'added', content: 'New feature.' },
    ],
    '1.3.0',
    '2026-11-02',
  );
  assert.match(
    out,
    /## \[Unreleased\]\n\n## \[1\.3\.0\] - 2026-11-02\n\n### Added\n\n- Old feature\.\n- New feature\.\n\n### Refactored\n\n- Old refactor\.\n\n### Fixed\n\n- Bug fixed\.\n\n## \[1\.1\.0\]/,
  );
  assert.deepEqual([...parseUnreleased(out).categories.keys()], []);
  assert.equal(extractNotes(out, '1.3.0').startsWith('### Added'), true);
  assert.equal(extractNotes(out, '1.1.0'), '### Added\n\n- First release.');
  assert.equal(extractNotes(out, '9.9.9'), null);
  assert.throws(
    () => collectChangelog(out, [{ type: 'fixed', content: 'x' }], '1.3.0', 'd'),
    /already/,
  );
  assert.throws(() => collectChangelog(out, [], '1.4.0', 'd'), /nothing to collect/);
});

test('version field bumps keep formatting', () => {
  const pkg = '{\n  "name": "x",\n  "version": "1.2.0",\n  "private": true\n}\n';
  assert.equal(bumpPackageJson(pkg, '1.3.0'), pkg.replace('1.2.0', '1.3.0'));
  const lock = JSON.stringify(
    { name: 'x', version: '1.2.0', lockfileVersion: 3, packages: { '': { version: '1.2.0' } } },
    null,
    2,
  );
  const bumped = JSON.parse(bumpLockfile(`${lock}\n`, '1.3.0'));
  assert.equal(bumped.version, '1.3.0');
  assert.equal(bumped.packages[''].version, '1.3.0');
  const gradle = '        versionCode 2\n        versionName "1.1.0"\n';
  assert.equal(bumpGradle(gradle, '1.3.0'), '        versionCode 3\n        versionName "1.3.0"\n');
  assert.throws(() => bumpGradle('nothing', '1.0.0'), /versionCode/);
});

test('verifyRelease lists every disagreeing field', () => {
  const changelog = '## [Unreleased]\n\n## [1.3.0] - 2026-11-02\n\n### Added\n\n- x\n';
  assert.deepEqual(
    verifyRelease(
      { packages: { 'package.json': '1.3.0' }, gradleVersionName: '1.3.0', changelog },
      '1.3.0',
    ),
    [],
  );
  const errors = verifyRelease(
    { packages: { 'server/package.json': '2.0.0' }, gradleVersionName: '1.1.0', changelog },
    '1.4.0',
  );
  assert.equal(errors.length, 3);
});

test('docs log fragments: validation and collection order', () => {
  const ok = '## 2026-10-27 — Something (claude-code)\n\n- did it\n';
  assert.deepEqual(validateLogFragment('2026-10-27-something.md', ok), []);
  assert.match(validateLogFragment('something.md', ok)[0], /YYYY-MM-DD/);
  assert.match(validateLogFragment('2026-10-28-something.md', ok)[0], /differs/);
  assert.match(validateLogFragment('2026-10-27-x.md', '## 2026-10-27 — S (a)\n')[0], /bullet/);
  assert.match(validateLogFragment('2026-10-27-x.md', 'no heading\n- a')[0], /first line/);

  const log = '# Log\n\nIntro.\n\n## 2026-10-20 — Old (a)\n\n- old\n';
  const out = collectLog(log, [
    { name: '2026-10-21-a.md', content: '## 2026-10-21 — A (a)\n\n- a\n' },
    { name: '2026-10-22-b.md', content: '## 2026-10-22 — B (b)\n\n- b\n' },
  ]);
  assert.equal(
    out,
    '# Log\n\nIntro.\n\n## 2026-10-22 — B (b)\n\n- b\n\n## 2026-10-21 — A (a)\n\n- a\n\n## 2026-10-20 — Old (a)\n\n- old\n',
  );
  assert.equal(collectLog(log, []), log);
  assert.equal(
    collectLog('# Log\n', [{ name: '2026-10-21-a.md', content: '## 2026-10-21 — A (a)\n\n- a' }]),
    '# Log\n\n## 2026-10-21 — A (a)\n\n- a\n',
  );
});

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-test-'));
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  for (const dir of ['', 'server/', 'signaling/']) {
    put(`${dir}package.json`, `${JSON.stringify({ name: 'p', version: '1.2.0' }, null, 2)}\n`);
    put(
      `${dir}package-lock.json`,
      `${JSON.stringify({ name: 'p', version: '1.2.0', packages: { '': { version: '1.2.0' } } }, null, 2)}\n`,
    );
  }
  put('android/app/build.gradle', 'versionCode 4\nversionName "1.2.0"\n');
  put('CHANGELOG.md', '# Changelog\n\n## [Unreleased]\n\n## [1.2.0] - 2026-10-01\n\n- x\n');
  put('docs/log.md', '# Log\n\nIntro.\n\n## 2026-10-01 — Old (a)\n\n- old\n');
  put('changelog.d/README.md', 'ignored');
  put('changelog.d/one.fixed.md', '- A fix.\n');
  put('changelog.d/two.added.md', '- A feature.\n');
  put('docs/log.d/.gitkeep', '');
  put('docs/log.d/2026-11-01-x.md', '## 2026-11-01 — X (claude-code)\n\n- x\n');
  return root;
}

const cli = (root, ...args) =>
  execFileSync(process.execPath, [CLI, ...args, '--root', root], { encoding: 'utf8' });

test('CLI: release flow from fragments to a verified version', () => {
  const root = makeRepo();
  try {
    assert.match(cli(root, 'check'), /2 changelog fragment\(s\) and 1 docs log/);
    assert.equal(cli(root, 'next-version'), '1.3.0\n');
    assert.equal(cli(root, 'next-version', '--bump', 'patch'), '1.2.1\n');
    assert.equal(cli(root, 'next-version', '--version', '2.0.0'), '2.0.0\n');

    cli(root, 'release', '1.3.0', '--date', '2026-11-02');
    assert.deepEqual(fs.readdirSync(path.join(root, 'changelog.d')), ['README.md']);
    assert.deepEqual(fs.readdirSync(path.join(root, 'docs/log.d')), ['.gitkeep']);
    assert.match(
      fs.readFileSync(path.join(root, 'docs/log.md'), 'utf8'),
      /Intro\.\n\n## 2026-11-01 — X/,
    );
    assert.match(
      fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8'),
      /versionCode 5/,
    );
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(root, 'signaling/package-lock.json'), 'utf8')).packages[
        ''
      ].version,
      '1.3.0',
    );
    assert.equal(
      cli(root, 'notes', '1.3.0'),
      '### Added\n\n- A feature.\n\n### Fixed\n\n- A fix.\n',
    );
    assert.match(cli(root, 'verify', '1.3.0'), /agree on 1\.3\.0/);
    assert.equal(cli(root, 'next-version'), '');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CLI: invalid fragments and inconsistent versions fail', () => {
  const root = makeRepo();
  try {
    fs.writeFileSync(path.join(root, 'changelog.d/bad.improvement.md'), '- x\n');
    const check = spawnSync(process.execPath, [CLI, 'check', '--root', root], { encoding: 'utf8' });
    assert.equal(check.status, 1);
    assert.match(check.stderr, /bad\.improvement\.md/);
    const verify = spawnSync(process.execPath, [CLI, 'verify', '1.3.0', '--root', root], {
      encoding: 'utf8',
    });
    assert.equal(verify.status, 1);
    assert.match(verify.stderr, /build\.gradle versionName is 1\.2\.0/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
