/**
 * Rule 11 of check-architecture: no hand-kept game lists outside the catalogue (ADR-0011)
 * [ID: SCRIPT-ARCH-GAME-LISTS]
 *
 * Games are declared in `src/games/<id>/definition.tsx` (and `src/games/tabletop/catalog.ts`)
 * and collected in `src/lib/catalog/`. An array literal elsewhere that names two or more
 * catalogue ids is a second list that drifts. Mark a deliberate one (a wire-format list that a
 * test keeps in step with the catalogue) with `game-list-ok` on the line before.
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFINITION_SOURCES = ['src/features/party/definition.tsx', 'src/games/tabletop/catalog.ts'];

/** Ids declared in the catalogue sources (`id: '…'` and the tabletop helper calls). */
export function catalogIds(rootDir) {
  const gamesDir = path.join(rootDir, 'src/games');
  const files = fs
    .readdirSync(gamesDir)
    .map((d) => path.join('src/games', d, 'definition.tsx'))
    .concat(DEFINITION_SOURCES)
    .filter((f) => fs.existsSync(path.join(rootDir, f)));
  const ids = new Set();
  for (const f of files) {
    const src = fs.readFileSync(path.join(rootDir, f), 'utf-8');
    for (const m of src.matchAll(/\bid: '([^']+)'/g)) ids.add(m[1]);
    for (const m of src.matchAll(/\b(?:starter|cardGame)\('([^']+)'/g)) ids.add(m[1]);
  }
  return ids;
}

export function isGameListCheckedFile(posixPath) {
  return (
    /^src\/.+\.(ts|tsx)$/.test(posixPath) &&
    !/\.(test|spec)\./.test(posixPath) &&
    !posixPath.includes('/__tests__/') &&
    !posixPath.startsWith('src/games/') &&
    !posixPath.startsWith('src/lib/catalog/')
  );
}

/** Line numbers of string-only array literals that name two or more catalogue ids. */
export function findGameLists(content, ids) {
  const found = [];
  for (const m of content.matchAll(/\[([^[\]]{0,600})\]/g)) {
    if (!/^\s*('[^']*'\s*,?\s*)+$/.test(m[1])) continue;
    const named = [...m[1].matchAll(/'([^']+)'/g)].filter((s) => ids.has(s[1]));
    if (named.length < 2) continue;
    const line = content.slice(0, m.index).split('\n').length;
    const previous = content.split('\n')[line - 2] ?? '';
    if (!previous.includes('game-list-ok')) found.push(line);
  }
  return found;
}
