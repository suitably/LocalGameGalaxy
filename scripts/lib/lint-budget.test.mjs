import test from 'node:test';
import assert from 'node:assert/strict';
import { countWarnings, compareToBaseline, lowerBaseline, sortCounts } from './lint-budget.mjs';

test('countWarnings keeps files with warnings as relative POSIX paths', () => {
  const counts = countWarnings(
    [
      { filePath: '/repo/src/a.ts', warningCount: 2 },
      { filePath: '/repo/src/clean.ts', warningCount: 0 },
      { filePath: 'C:\\repo\\src\\b.ts', warningCount: 1 },
    ],
    '/repo',
  );
  assert.deepEqual(counts, { 'src/a.ts': 2, 'C:/repo/src/b.ts': 1 });
});

test('compareToBaseline flags increases, new files with warnings and stale baselines', () => {
  const { increased, stale } = compareToBaseline(
    { 'src/a.ts': 3, 'src/new.ts': 1, 'src/same.ts': 4 },
    { 'src/a.ts': 2, 'src/same.ts': 4, 'src/fixed.ts': 5, 'src/better.ts': 3 },
  );
  assert.deepEqual(increased, [
    { file: 'src/a.ts', baseline: 2, current: 3 },
    { file: 'src/new.ts', baseline: 0, current: 1 },
  ]);
  assert.deepEqual(stale, [
    { file: 'src/better.ts', baseline: 3, current: 0 },
    { file: 'src/fixed.ts', baseline: 5, current: 0 },
  ]);
});

test('compareToBaseline passes when counts equal the baseline', () => {
  assert.deepEqual(compareToBaseline({ 'src/a.ts': 2 }, { 'src/a.ts': 2 }), {
    increased: [],
    stale: [],
  });
});

test('lowerBaseline only lowers or removes entries, never raises or adds', () => {
  assert.deepEqual(
    lowerBaseline(
      { 'src/a.ts': 1, 'src/b.ts': 9, 'src/new.ts': 2 },
      { 'src/a.ts': 3, 'src/b.ts': 4, 'src/gone.ts': 2 },
    ),
    { 'src/a.ts': 1, 'src/b.ts': 4 },
  );
});

test('sortCounts orders keys for a stable JSON file', () => {
  assert.deepEqual(Object.keys(sortCounts({ b: 1, a: 2 })), ['a', 'b']);
});
