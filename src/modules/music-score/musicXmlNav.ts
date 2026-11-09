import { kids } from './xmlDom';

/**
 * Jump marks of one written bar. Targets (`segno`, `coda`) sit at the start of the bar,
 * jumps (`dacapo`, `dalsegno`, `tocoda`) and `fine` at its end. String values are the
 * MusicXML names that pair a jump with its target (`<sound dalsegno="s1">` → `<sound segno="s1">`).
 */
export interface BarNav {
  segno?: string;
  coda?: string;
  dacapo?: boolean;
  dalsegno?: string;
  tocoda?: string;
  fine?: boolean;
}

const NAV_ATTRS = ['segno', 'coda', 'dacapo', 'dalsegno', 'tocoda', 'fine'] as const;

function applySound(s: Element, nav: BarNav): void {
  if (s.hasAttribute('segno')) nav.segno ??= s.getAttribute('segno') ?? '';
  if (s.hasAttribute('coda')) nav.coda ??= s.getAttribute('coda') ?? '';
  if (s.hasAttribute('dalsegno')) nav.dalsegno ??= s.getAttribute('dalsegno') ?? '';
  if (s.hasAttribute('tocoda')) nav.tocoda ??= s.getAttribute('tocoda') ?? '';
  if (s.getAttribute('dacapo') === 'yes') nav.dacapo = true;
  if (s.hasAttribute('fine')) nav.fine = true;
}

/** Plain-text marks for scores that write "D.S. al Coda" as `<words>` without a `<sound>`. */
function applyWords(words: string, nav: BarNav): void {
  const w = words.trim();
  if (/^(d\.?\s?c\.?|da\s+capo)(\s|$)/i.test(w)) nav.dacapo = true;
  else if (/^(d\.?\s?s\.?|dal\s+segno)(\s|$)/i.test(w)) nav.dalsegno ??= '';
  else if (/^to\s+coda\b/i.test(w)) nav.tocoda ??= '';
  else if (/^fine\.?$/i.test(w)) nav.fine = true;
}

/** Reads segno, coda, D.C., D.S., To Coda and Fine of one `<measure>`; null when it has none. */
export function readNav(measure: Element): BarNav | null {
  const nav: BarNav = {};
  for (const s of Array.from(measure.getElementsByTagName('sound'))) applySound(s, nav);
  for (const holder of [...kids(measure, 'direction'), ...kids(measure, 'barline')]) {
    const sound = holder.getElementsByTagName('sound')[0];
    const has = (attr: string) => !!sound?.hasAttribute(attr);
    // A bare symbol is a target; the coda sign next to a "To Coda" sound is the jump itself.
    if (holder.getElementsByTagName('segno').length && !has('segno')) nav.segno ??= '';
    if (holder.getElementsByTagName('coda').length && !has('coda') && !has('tocoda'))
      nav.coda ??= '';
    if (NAV_ATTRS.some(has)) continue;
    for (const w of Array.from(holder.getElementsByTagName('words')))
      applyWords(w.textContent ?? '', nav);
  }
  return Object.keys(nav).length ? nav : null;
}

/** Index of the segno a D.S. jumps to: same name, else the closest one before, else the first. */
export function findSegno(navs: (BarNav | null | undefined)[], name: string, from: number): number {
  const all = navs.flatMap((n, i) => (n?.segno !== undefined ? [i] : []));
  const named = all.find((i) => navs[i]?.segno === name);
  if (named !== undefined) return named;
  const before = all.filter((i) => i <= from);
  return before.length ? before[before.length - 1] : (all[0] ?? -1);
}

/** Index of the coda a "To Coda" jumps to: same name after `from`, else the next one after it. */
export function findCoda(navs: (BarNav | null | undefined)[], name: string, from: number): number {
  const after = navs.flatMap((n, i) => (i > from && n?.coda !== undefined ? [i] : []));
  return after.find((i) => navs[i]?.coda === name) ?? after[0] ?? -1;
}
