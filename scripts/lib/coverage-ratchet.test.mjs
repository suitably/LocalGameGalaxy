import test from 'node:test';
import assert from 'node:assert/strict';
import { isLogicFile, logicCoverage, compareCoverage, buildBaseline } from './coverage-ratchet.mjs';

test('isLogicFile matches logic/ sources only', () => {
  assert.equal(isLogicFile('src/games/a/logic/x.ts'), true);
  assert.equal(isLogicFile('src/games/a/logic/sub/x.ts'), true);
  assert.equal(isLogicFile('src/games/a/logic/x.test.ts'), false);
  assert.equal(isLogicFile('src/games/a/logic/x.d.ts'), false);
  assert.equal(isLogicFile('src/games/a/logic/x.tsx'), false);
  assert.equal(isLogicFile('src/games/a/components/x.ts'), false);
  assert.equal(isLogicFile('src/modules/logicish/x.ts'), false);
});

test('logicCoverage floors percentages, strips the root and skips non-logic files', () => {
  const out = logicCoverage(
    {
      total: { lines: { total: 100, covered: 50 } },
      '/repo/src/g/logic/a.ts': { lines: { total: 3, covered: 2 } },
      '/repo/src/g/logic/empty.ts': { lines: { total: 0, covered: 0 } },
      '/repo/src/g/ui/b.ts': { lines: { total: 10, covered: 10 } },
    },
    '/repo',
  );
  assert.deepEqual(out, {
    'src/g/logic/a.ts': { total: 3, pct: 66 },
    'src/g/logic/empty.ts': { total: 0, pct: 100 },
  });
});

test('compareCoverage tolerates drops up to 2 points and flags larger ones', () => {
  const baseline = { 'src/a/logic/x.ts': 80, 'src/a/logic/y.ts': 80 };
  const { dropped } = compareCoverage(
    { 'src/a/logic/x.ts': { total: 50, pct: 78 }, 'src/a/logic/y.ts': { total: 50, pct: 77 } },
    baseline,
  );
  assert.deepEqual(dropped, [{ file: 'src/a/logic/y.ts', baseline: 80, current: 77 }]);
});

test('compareCoverage passes increases', () => {
  const r = compareCoverage(
    { 'src/a/logic/x.ts': { total: 50, pct: 95 } },
    { 'src/a/logic/x.ts': 80 },
  );
  assert.deepEqual(r, { dropped: [], weakNew: [], missing: [] });
});

test('compareCoverage flags new files of >= 30 lines below 60 %, not small or well-covered ones', () => {
  const { weakNew } = compareCoverage(
    {
      'src/a/logic/big-weak.ts': { total: 40, pct: 0 },
      'src/a/logic/edge.ts': { total: 30, pct: 59 },
      'src/a/logic/ok.ts': { total: 40, pct: 60 },
      'src/a/logic/small.ts': { total: 29, pct: 0 },
    },
    {},
  );
  assert.deepEqual(
    weakNew.map((w) => w.file),
    ['src/a/logic/big-weak.ts', 'src/a/logic/edge.ts'],
  );
});

test('compareCoverage reports baseline files that no longer exist', () => {
  const { missing } = compareCoverage({}, { 'src/a/logic/gone.ts': 50 });
  assert.deepEqual(missing, ['src/a/logic/gone.ts']);
});

test('buildBaseline writes sorted file -> percent', () => {
  assert.deepEqual(
    buildBaseline({
      'src/b/logic/b.ts': { total: 5, pct: 10 },
      'src/a/logic/a.ts': { total: 5, pct: 90 },
    }),
    { 'src/a/logic/a.ts': 90, 'src/b/logic/b.ts': 10 },
  );
});
