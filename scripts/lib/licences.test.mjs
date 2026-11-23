import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotice,
  findViolations,
  isLicenceAllowed,
  packageNameFromPath,
  parseSpdx,
  productionPackages,
} from './licences.mjs';

test('parseSpdx: AND binds tighter than OR, parentheses and WITH', () => {
  assert.deepEqual(parseSpdx('MIT OR Apache-2.0 AND GPL-2.0-only'), {
    type: 'or',
    left: { type: 'id', id: 'MIT' },
    right: {
      type: 'and',
      left: { type: 'id', id: 'Apache-2.0' },
      right: { type: 'id', id: 'GPL-2.0-only' },
    },
  });
  assert.deepEqual(parseSpdx('(GPL-2.0-or-later WITH Classpath-exception-2.0)'), {
    type: 'id',
    id: 'GPL-2.0-or-later',
    exception: 'Classpath-exception-2.0',
  });
  assert.throws(() => parseSpdx('(MIT'));
  assert.throws(() => parseSpdx('MIT OR'));
});

test('isLicenceAllowed: single ids, OR with one allowed side, AND needs all', () => {
  assert.equal(isLicenceAllowed('MIT'), true);
  assert.equal(isLicenceAllowed('(MPL-2.0 OR Apache-2.0)'), true);
  assert.equal(isLicenceAllowed('WTFPL OR ISC'), true);
  assert.equal(isLicenceAllowed('(MIT AND Zlib)'), true);
  assert.equal(isLicenceAllowed('GPL-2.0-only'), false);
  assert.equal(isLicenceAllowed('GPL-2.0-only OR MIT'), true);
  assert.equal(isLicenceAllowed('MIT AND SSPL-1.0'), false);
  assert.equal(isLicenceAllowed('BUSL-1.1'), false);
  assert.equal(isLicenceAllowed('BSD'), false);
  assert.equal(isLicenceAllowed('MPL 2.0'), true); // alias
  assert.equal(isLicenceAllowed(null), false);
  assert.equal(isLicenceAllowed('(MIT'), false);
});

test('packageNameFromPath handles nested and scoped packages', () => {
  assert.equal(packageNameFromPath('node_modules/a/node_modules/@s/b'), '@s/b');
  assert.equal(packageNameFromPath('node_modules/react'), 'react');
});

const lock = {
  lockfileVersion: 3,
  packages: {
    '': { name: 'app', license: 'AGPL-3.0-or-later' },
    'node_modules/react': { version: '19.0.0', license: 'MIT' },
    'node_modules/vitest': { version: '3.0.0', license: 'MIT', dev: true },
    'node_modules/fuzzy': { version: '0.1.3' },
    'node_modules/bad': { version: '1.0.0', license: 'SSPL-1.0' },
    'node_modules/linked': { link: true, resolved: 'packages/linked' },
  },
};

test('productionPackages skips root, dev and links and applies overrides', () => {
  const pkgs = productionPackages(lock);
  assert.deepEqual(
    pkgs.map((p) => `${p.name}@${p.version}:${p.license}`),
    ['bad@1.0.0:SSPL-1.0', 'fuzzy@0.1.3:MIT', 'react@19.0.0:MIT'],
  );
  assert.deepEqual(
    findViolations(pkgs).map((p) => p.name),
    ['bad'],
  );
});

test('buildNotice lists each package once with its licence text', () => {
  const pkgs = [
    { path: 'node_modules/a', name: 'a', version: '1.0.0', license: 'MIT' },
    { path: 'node_modules/x/node_modules/a', name: 'a', version: '1.0.0', license: 'MIT' },
    { path: 'node_modules/b', name: 'b', version: '2.0.0', license: 'ISC' },
  ];
  const text = buildNotice('Test', pkgs, (p) => (p.name === 'a' ? 'MIT text' : null));
  assert.equal(text.match(/^a@1\.0\.0$/gm).length, 1);
  assert.match(text, /MIT text/);
  assert.match(text, /b@2\.0\.0\nLicense: ISC/);
  assert.match(text, /ships no licence file/);
});
