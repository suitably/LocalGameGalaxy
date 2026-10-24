/**
 * Detection of hard-coded colours in component source (DESIGN.md §2: components use theme tokens).
 * Counts hex literals and non-black rgb()/rgba() calls inside string and template literals only,
 * so comments, JSX text (`&#123;`) and identifiers are never matched.
 */

/** Paths (POSIX, relative to the repo root) that may hold raw colours. Mirrors DESIGN.md §2.3 "Exempt". */
const EXEMPT_PATTERNS = [
  /^src\/themeTokens\.ts$/,
  /^src\/theme\.ts$/,
  /^src\/games\/tabletop\/logic\//,
  /^src\/games\/tabletop\/components\/widgets\//,
  /(^|\/)musicXmlParser\.ts$/,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
];

/**
 * @param {string} relPath repo-relative path
 * @returns {boolean} true when the colour rule applies (a `src` .tsx file that is not exempt)
 */
export function isColorCheckedFile(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (!p.startsWith('src/') || !p.endsWith('.tsx')) return false;
  return !EXEMPT_PATTERNS.some((re) => re.test(p));
}

const HEX_RE = /(?<![\w&#/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const RGB_RE = /\brgba?\(\s*(\d+(?:\.\d+)?%?)[\s,]+(\d+(?:\.\d+)?%?)[\s,]+(\d+(?:\.\d+)?%?)/gi;

/** `url(#abc)` is an SVG reference, not a colour. */
function isUrlRef(text, index) {
  return text.slice(Math.max(0, index - 4), index) === 'url(';
}

/**
 * @param {string} text content of one string/template literal chunk
 * @returns {number}
 */
function countInString(text) {
  let count = 0;
  for (const m of text.matchAll(HEX_RE)) {
    if (!isUrlRef(text, m.index)) count += 1;
  }
  for (const m of text.matchAll(RGB_RE)) {
    const isBlack = [m[1], m[2], m[3]].every((v) => parseFloat(v) === 0);
    if (!isBlack) count += 1;
  }
  return count;
}

const REGEX_PREV = new Set([...'(,=:[!&|?{};+-*%<>~^']);

/**
 * Extracts the text of every string / template literal chunk, skipping comments and regex literals.
 * Quote strings end at a newline so an apostrophe in JSX text cannot swallow following code.
 * @param {string} src
 * @returns {string[]}
 */
export function extractStringLiterals(src) {
  const out = [];
  const n = src.length;
  /** Saved brace depths of open `${ }` template expressions. */
  const templateStack = [];
  let braceDepth = 0;
  let prevSig = '';
  let i = 0;

  // i is just after the opening backtick or after the closing brace of a `${ }`
  const readTemplate = () => {
    let chunk = '';
    while (i < n) {
      const c = src[i];
      if (c === '\\') {
        chunk += src.slice(i, i + 2);
        i += 2;
      } else if (c === '`') {
        out.push(chunk);
        i += 1;
        prevSig = '`';
        return;
      } else if (c === '$' && src[i + 1] === '{') {
        out.push(chunk);
        i += 2;
        templateStack.push(braceDepth);
        braceDepth = 0;
        return;
      } else {
        chunk += c;
        i += 1;
      }
    }
    out.push(chunk);
  };

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i += 1;
    } else if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      let chunk = '';
      while (j < n && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') {
          chunk += src.slice(j, j + 2);
          j += 2;
        } else {
          chunk += src[j];
          j += 1;
        }
      }
      if (src[j] === c) {
        out.push(chunk);
        i = j + 1;
      } else {
        i = j;
      }
      prevSig = c;
    } else if (c === '`') {
      i += 1;
      readTemplate();
    } else if (c === '/' && (prevSig === '' || REGEX_PREV.has(prevSig))) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') j += 1;
        else if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
        j += 1;
      }
      i = j + 1;
      prevSig = '/';
    } else {
      if (c === '{') {
        braceDepth += 1;
      } else if (c === '}') {
        if (braceDepth === 0 && templateStack.length > 0) {
          braceDepth = templateStack.pop();
          i += 1;
          readTemplate();
          continue;
        }
        braceDepth -= 1;
      }
      if (!/\s/.test(c)) prevSig = c;
      i += 1;
    }
  }
  return out;
}

/**
 * @param {string} source file content
 * @returns {number} hex literals plus non-black rgb()/rgba() calls inside string literals
 */
export function countHardcodedColors(source) {
  return extractStringLiterals(source).reduce((sum, text) => sum + countInString(text), 0);
}
