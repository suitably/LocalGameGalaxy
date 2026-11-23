/**
 * Import cycle detection [ID: SCRIPT-IMPORT-CYCLES]
 *
 * Builds the value-import graph of `src` and finds strongly connected components with more than
 * one file (or a self-import). Skipped: `import type` / `export type … from`, imports whose
 * specifiers are all `type X`, dynamic `import()` (lazy, does not fix the load order) and test files.
 * Pure functions; `scripts/check-architecture.mjs` does the file reading and reporting.
 */
import path from 'node:path';

const STATIC_IMPORT_RE =
  /(?:^|[\n;])\s*(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]/g;

/** Source without comments, so commented-out imports are ignored. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}

/** `{ type A, type B }`: every named specifier is type-only (nothing is imported at runtime). */
function isTypeOnlyClause(clause) {
  const m = clause.match(/^\{([\s\S]*)\}$/);
  if (!m) return false;
  const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  return names.length > 0 && names.every((n) => /^type\s/.test(n));
}

/** Module specifiers a file loads at runtime through static `import` / `export … from`. */
export function extractValueImports(source) {
  const specs = [];
  for (const m of stripComments(source).matchAll(STATIC_IMPORT_RE)) {
    if (m[5]) {
      specs.push(m[5]);
      continue;
    }
    const [, , typeKeyword, clause, spec] = m;
    if (typeKeyword) continue;
    if (isTypeOnlyClause(clause.trim())) continue;
    specs.push(spec);
  }
  return specs;
}

const EXTENSIONS = ['.ts', '.tsx'];

/** Repo-relative POSIX path of the file a specifier points to, or null (package, unknown file). */
export function resolveImport(spec, fromFile, fileSet) {
  let base;
  if (spec.startsWith('.')) base = path.posix.join(path.posix.dirname(fromFile), spec);
  else if (spec.startsWith('@/')) base = path.posix.join('src', spec.slice(2));
  else return null;
  const candidates = [
    base,
    ...EXTENSIONS.map((e) => base + e),
    ...EXTENSIONS.map((e) => `${base}/index${e}`),
  ];
  return candidates.find((c) => fileSet.has(c)) ?? null;
}

export function isCycleCheckedFile(file) {
  return (
    /\.(ts|tsx)$/.test(file) &&
    !/\.(test|spec)\.(ts|tsx)$/.test(file) &&
    !file.includes('/__tests__/')
  );
}

/** `files`: Map of repo-relative POSIX path to source text. Returns Map file -> sorted targets. */
export function buildImportGraph(files) {
  const checked = new Map([...files].filter(([f]) => isCycleCheckedFile(f)));
  const fileSet = new Set(checked.keys());
  const graph = new Map();
  for (const [file, source] of checked) {
    const targets = new Set();
    for (const spec of extractValueImports(source)) {
      const target = resolveImport(spec, file, fileSet);
      if (target) targets.add(target);
    }
    graph.set(file, [...targets].sort());
  }
  return graph;
}

/** Strongly connected components with more than one file (or a self-loop), Tarjan, iterative. */
export function findCycles(graph) {
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  let counter = 0;

  for (const start of [...graph.keys()].sort()) {
    if (index.has(start)) continue;
    const work = [{ node: start, next: 0 }];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const { node } = frame;
      if (frame.next === 0) {
        index.set(node, counter);
        low.set(node, counter);
        counter += 1;
        stack.push(node);
        onStack.add(node);
      }
      const targets = graph.get(node) ?? [];
      if (frame.next < targets.length) {
        const target = targets[frame.next];
        frame.next += 1;
        if (!graph.has(target)) continue;
        if (!index.has(target)) work.push({ node: target, next: 0 });
        else if (onStack.has(target)) low.set(node, Math.min(low.get(node), index.get(target)));
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1].node;
        low.set(parent, Math.min(low.get(parent), low.get(node)));
      }
      if (low.get(node) === index.get(node)) {
        const component = [];
        let member;
        do {
          member = stack.pop();
          onStack.delete(member);
          component.push(member);
        } while (member !== node);
        const selfLoop = component.length === 1 && (graph.get(node) ?? []).includes(node);
        if (component.length > 1 || selfLoop) cycles.push(component.sort());
      }
    }
  }
  return cycles.sort((a, b) => a[0].localeCompare(b[0]));
}

/** One concrete import chain through a component, for the report: a -> b -> … -> a. */
export function cyclePath(component, graph) {
  const inside = new Set(component);
  const start = component[0];
  const seen = new Set([start]);
  const walk = (node, trail) => {
    for (const next of graph.get(node) ?? []) {
      if (next === start) return [...trail, start];
      if (!inside.has(next) || seen.has(next)) continue;
      seen.add(next);
      const found = walk(next, [...trail, next]);
      if (found) return found;
    }
    return null;
  };
  return walk(start, [start]) ?? [...component, start];
}
