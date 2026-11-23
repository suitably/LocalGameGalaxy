import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countIssues,
  compareToBaseline,
  lowerBaseline,
  sortCounts,
  totalsByCategory,
} from './deadcode-ratchet.mjs';

const report = {
  issues: [
    { file: 'src/a.ts', exports: [{ name: 'x' }, { name: 'y' }], types: [], files: [] },
    { file: 'src/b.ts', types: [{ name: 'T' }], files: true },
    { file: 'package.json', devDependencies: [{ name: 'foo' }] },
    { file: 'src/c.ts', exports: [] },
  ],
};

test('countIssues counts per category and file, skipping empty ones', () => {
  assert.deepEqual(countIssues(report), {
    'exports:src/a.ts': 2,
    'types:src/b.ts': 1,
    'files:src/b.ts': 1,
    'devDependencies:package.json': 1,
  });
  assert.deepEqual(countIssues({}), {});
});

test('compareToBaseline reports increases and new keys, and stale baselines', () => {
  const { increased, stale } = compareToBaseline(
    { 'exports:a': 3, 'exports:new': 1, 'types:b': 1 },
    { 'exports:a': 2, 'types:b': 2, 'exports:gone': 4 },
  );
  assert.deepEqual(increased, [
    { key: 'exports:a', baseline: 2, current: 3 },
    { key: 'exports:new', baseline: 0, current: 1 },
  ]);
  assert.deepEqual(stale, [
    { key: 'exports:gone', baseline: 4, current: 0 },
    { key: 'types:b', baseline: 2, current: 1 },
  ]);
});

test('compareToBaseline passes when counts equal or fall', () => {
  const { increased } = compareToBaseline({ 'exports:a': 1 }, { 'exports:a': 2 });
  assert.deepEqual(increased, []);
});

test('lowerBaseline never raises and drops zeroed entries', () => {
  assert.deepEqual(
    lowerBaseline(
      { 'exports:a': 5, 'types:b': 1 },
      { 'exports:a': 2, 'types:b': 3, 'exports:c': 1 },
    ),
    { 'exports:a': 2, 'types:b': 1 },
  );
});

test('sortCounts and totalsByCategory', () => {
  assert.deepEqual(Object.keys(sortCounts({ 'b:x': 1, 'a:y': 1 })), ['a:y', 'b:x']);
  assert.deepEqual(totalsByCategory({ 'exports:a': 2, 'exports:b': 1, 'types:a': 4 }), {
    exports: 3,
    types: 4,
  });
});
