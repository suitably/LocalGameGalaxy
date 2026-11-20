/**
 * Detection helpers for the header / navigation rules (AGENTS.md §4, DESIGN.md §6 "Header / nav"):
 * no second top bar (`AppBar`) in games, `setHeaderHidden(` only where allowed, back-arrow icon
 * ratchet, and a count of `IconButton`s without an accessible name.
 * Pure string functions so they can be unit-tested; the ratchet wiring lives in check-architecture.mjs.
 */

/**
 * Blanks block comments (keeping line breaks) and whole-line `//` comments, so commented-out code
 * is never matched. Trailing `//` comments are left alone on purpose: `//` also occurs in URLs.
 * @param {string} src
 * @returns {string}
 */
export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Files that define or consume `setHeaderHidden`, plus the single allowed caller. POSIX paths. */
export const SET_HEADER_HIDDEN_ALLOWLIST = [
  // The only running-game exception (maintainer decision 2026-11-16): fullscreen immersive stage.
  'src/games/melodiq-notes/stage/useImmersive.ts',
  // Definition and composite re-export of the setter.
  'src/context/HeaderLayoutContext.tsx',
  'src/context/LayoutContext.tsx',
];

/**
 * @param {string} relPath POSIX repo-relative path
 * @returns {boolean} true when the file may mention `setHeaderHidden(`
 */
export function isSetHeaderHiddenAllowed(relPath) {
  return (
    SET_HEADER_HIDDEN_ALLOWLIST.includes(relPath) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(relPath)
  );
}

/**
 * @param {string} source
 * @returns {number[]} 1-based line numbers that call `setHeaderHidden(`
 */
export function findSetHeaderHiddenCalls(source) {
  const lines = stripComments(source).split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    if (/\bsetHeaderHidden\s*\??\.?\(/.test(line)) hits.push(i + 1);
  });
  return hits;
}

/**
 * Detects MUI `AppBar` imports (`import { AppBar } from '@mui/material'`, also multi-line or aliased,
 * and `import X from '@mui/material/AppBar'`). Renamed imports are caught because the import itself is.
 * @param {string} source
 * @returns {number} number of AppBar imports
 */
export function countAppBarImports(source) {
  const code = stripComments(source);
  let count = 0;
  for (const m of code.matchAll(
    /import\s+(?:type\s+)?([\w$]+\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"](@mui\/material(?:\/AppBar)?|@mui\/material\/index|@mui\/material\/esm\/AppBar|@mui\/material\/node\/AppBar)['"]/g,
  )) {
    const isAppBarModule = /AppBar$/.test(m[3]);
    if (isAppBarModule) {
      count += 1;
      continue;
    }
    const named = (m[2] ?? '').split(',').map((s) =>
      s
        .trim()
        .split(/\s+as\s+/)[0]
        .replace(/^type\s+/, ''),
    );
    if (named.includes('AppBar')) count += 1;
  }
  return count;
}

/** Back-style icon module / export names, with or without a MUI variant suffix. */
const BACK_ICON_RE =
  /^(?:ArrowBack(?:Ios(?:New)?)?|ChevronLeft|KeyboardBackspace)(?:Rounded|Outlined|Sharp|TwoTone)?$/;

/**
 * Counts imports of back-style icons from '@mui/icons-material': one per import
 * (`import X from '@mui/icons-material/ArrowBackRounded'`, `{ default as X } from <same>`, or a
 * named `{ ArrowBack } from '@mui/icons-material'` specifier). Usages are not counted, so one import
 * used five times is one back icon.
 * @param {string} source
 * @returns {number}
 */
export function countBackIconImports(source) {
  const code = stripComments(source);
  let count = 0;
  for (const m of code.matchAll(
    /import\s+(?:type\s+)?(?:[\w$]+\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]@mui\/icons-material(?:\/([\w]+))?['"]/g,
  )) {
    const [, specifiers, modulePath] = m;
    if (modulePath) {
      if (BACK_ICON_RE.test(modulePath)) count += 1;
    } else if (specifiers) {
      for (const s of specifiers.split(',')) {
        const name = s.trim().split(/\s+as\s+/)[0];
        if (BACK_ICON_RE.test(name)) count += 1;
      }
    }
  }
  return count;
}

/** Paths where the back-icon ratchet applies: games and shared components, except the global header. */
export function isBackIconCheckedFile(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (!/^src\/(games|components)\//.test(p) || !/\.tsx?$/.test(p)) return false;
  if (p.startsWith('src/components/Layout/')) return false;
  return !/\.(test|spec)\.[cm]?[jt]sx?$/.test(p);
}

/** @returns {boolean} true when the AppBar rule applies (non-test file under src/games) */
export function isAppBarCheckedFile(relPath) {
  const p = relPath.replace(/\\/g, '/');
  return p.startsWith('src/games/') && /\.tsx?$/.test(p) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(p);
}

/**
 * Reads the attribute text of the JSX opening tag that starts right after `from` (the index after
 * the tag name). Tracks `{ }` depth and quotes so `=>` or `>` inside expressions do not end the tag.
 * @returns {string | null} attribute text, or null when the tag never closes
 */
function readOpeningTagAttributes(code, from) {
  let depth = 0;
  let quote = '';
  for (let i = from; i < code.length; i += 1) {
    const c = code[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'" || (c === '`' && depth > 0)) {
      quote = c;
    } else if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
    } else if (c === '>' && depth === 0) {
      return code.slice(from, i);
    }
  }
  return null;
}

/**
 * Finds `<IconButton` elements without an accessible name. An element counts as named when its
 * attributes hold `aria-label`, `aria-labelledby`, `title` or a `{...spread}` (assumed to carry a
 * label), or when it sits inside an unclosed `<Tooltip` (MUI Tooltip names its child from `title`).
 * @param {string} source
 * @returns {number[]} 1-based line numbers of unnamed IconButtons
 */
export function findUnlabeledIconButtons(source) {
  const code = stripComments(source);
  const hits = [];
  for (const m of code.matchAll(/<IconButton(?=[\s/>])/g)) {
    const attrs = readOpeningTagAttributes(code, m.index + m[0].length);
    if (attrs === null) continue;
    if (/(?:^|\s)(?:aria-label|aria-labelledby|title)\s*=|\{\s*\.\.\./.test(attrs)) continue;
    const before = code.slice(0, m.index);
    if (before.lastIndexOf('<Tooltip') > before.lastIndexOf('</Tooltip>')) continue;
    hits.push(before.split('\n').length);
  }
  return hits;
}
