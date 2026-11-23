import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildImportGraph,
  cyclePath,
  extractValueImports,
  findCycles,
  resolveImport,
} from './import-cycles.mjs';

test('extractValueImports: value imports and re-exports count, type-only and dynamic do not', () => {
  const src = [
    "import a from './a';",
    "import { b, type C } from './b';",
    "import type { D } from './d';",
    "import { type E, type F } from './e';",
    "export { g } from './g';",
    "export type { H } from './h';",
    "import './side';",
    "import * as ns from './ns';",
    "const lazy = () => import('./lazy');",
    "// import x from './commented';",
    "/* import y from './block'; */",
    'import {\n  m,\n  n,\n} from "./multi";',
  ].join('\n');
  assert.deepEqual(extractValueImports(src), [
    './a',
    './b',
    './g',
    './side',
    './ns',
    './multi',
  ]);
});

test('resolveImport: relative, alias, index files, packages', () => {
  const set = new Set(['src/a/x.ts', 'src/a/y.tsx', 'src/a/dir/index.ts', 'src/lib/z.ts']);
  assert.equal(resolveImport('./y', 'src/a/x.ts', set), 'src/a/y.tsx');
  assert.equal(resolveImport('./dir', 'src/a/x.ts', set), 'src/a/dir/index.ts');
  assert.equal(resolveImport('../lib/z', 'src/a/x.ts', set), 'src/lib/z.ts');
  assert.equal(resolveImport('@/lib/z', 'src/a/x.ts', set), 'src/lib/z.ts');
  assert.equal(resolveImport('react', 'src/a/x.ts', set), null);
  assert.equal(resolveImport('./missing', 'src/a/x.ts', set), null);
});

test('findCycles: reports a two-file and a three-file cycle, ignores type-only back edges and tests', () => {
  const files = new Map([
    ['src/a.ts', "import { b } from './b';"],
    ['src/b.ts', "import { a } from './a';"],
    ['src/c.ts', "import { d } from './d';"],
    ['src/d.ts', "import { e } from './e';"],
    ['src/e.ts', "import { c } from './c';"],
    ['src/ok1.ts', "import { ok2 } from './ok2';"],
    ['src/ok2.ts', "import type { Ok1 } from './ok1';"],
    ['src/t.ts', "import { t } from './t.test';"],
    ['src/t.test.ts', "import { t } from './t';"],
  ]);
  const graph = buildImportGraph(files);
  const cycles = findCycles(graph);
  assert.deepEqual(cycles, [
    ['src/a.ts', 'src/b.ts'],
    ['src/c.ts', 'src/d.ts', 'src/e.ts'],
  ]);
  assert.deepEqual(cyclePath(cycles[0], graph), ['src/a.ts', 'src/b.ts', 'src/a.ts']);
});

test('findCycles: a self-import is a cycle, an acyclic graph has none', () => {
  assert.deepEqual(findCycles(buildImportGraph(new Map([['src/s.ts', "import './s';"]]))), [
    ['src/s.ts'],
  ]);
  assert.deepEqual(
    findCycles(
      buildImportGraph(
        new Map([
          ['src/a.ts', "import './b';"],
          ['src/b.ts', ''],
        ]),
      ),
    ),
    [],
  );
});
