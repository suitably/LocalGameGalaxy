import { kid, num, text } from './xmlDom';
import type { ScoreChord } from './types';

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SPELL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Lead-sheet suffix of every MusicXML `<kind>` value (used when the score gives no `text`). */
const KIND_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  augmented: 'aug',
  diminished: 'dim',
  dominant: '7',
  'major-seventh': 'maj7',
  'minor-seventh': 'm7',
  'diminished-seventh': 'dim7',
  'augmented-seventh': 'aug7',
  'half-diminished': 'm7b5',
  'major-minor': 'm(maj7)',
  'major-sixth': '6',
  'minor-sixth': 'm6',
  'dominant-ninth': '9',
  'major-ninth': 'maj9',
  'minor-ninth': 'm9',
  'dominant-11th': '11',
  'major-11th': 'maj11',
  'minor-11th': 'm11',
  'dominant-13th': '13',
  'major-13th': 'maj13',
  'minor-13th': 'm13',
  'suspended-second': 'sus2',
  'suspended-fourth': 'sus4',
  power: '5',
};

/** A chord symbol of one written bar; `rel` is its beat within the bar. */
export interface BarChord extends Omit<ScoreChord, 't'> {
  rel: number;
}

/** Pitch class and spelling of a `<root>` / `<bass>` element, moved by `transpose` semitones. */
function readPitch(el: Element | null, prefix: string, transpose: number) {
  const step = text(el, `${prefix}-step`);
  if (!el || !step || STEP[step] === undefined) return null;
  const alter = Math.round(num(el, `${prefix}-alter`));
  const pc = (((STEP[step] + alter + transpose) % 12) + 12) % 12;
  const name = transpose % 12 ? SPELL[pc] : step + (alter > 0 ? '#' : 'b').repeat(Math.abs(alter));
  return { pc, name };
}

/**
 * Reads one `<harmony>` at division position `pos`; null for a harmony without a root
 * (Roman-numeral `<function>` only). `<kind>none</kind>` is "N.C." with root null.
 */
export function readHarmony(
  h: Element,
  pos: number,
  div: number,
  transpose: number,
): BarChord | null {
  const kindEl = h.getElementsByTagName('kind')[0];
  const kind = kindEl?.textContent?.trim() || 'major';
  const rel = (pos + num(h, 'offset')) / div;
  if (kind === 'none') return { rel, symbol: 'N.C.', root: null, kind };
  const root = readPitch(kid(h, 'root'), 'root', transpose);
  if (!root) return null;
  const bass = readPitch(kid(h, 'bass'), 'bass', transpose);
  const suffix = kindEl?.hasAttribute('text')
    ? (kindEl.getAttribute('text') ?? '')
    : (KIND_SUFFIX[kind] ?? '');
  const chord: BarChord = {
    rel,
    symbol: root.name + suffix + (bass && bass.pc !== root.pc ? `/${bass.name}` : ''),
    root: root.pc,
    kind,
  };
  if (bass && bass.pc !== root.pc) chord.bass = bass.pc;
  return chord;
}

/** Lays written-bar chord symbols out in play order, like `writeOutNotes` does for notes. */
export function writeOutChords(
  bars: BarChord[][],
  order: number[],
  starts: number[],
): ScoreChord[] {
  return order.flatMap((k, idx) =>
    (bars[k] ?? []).map(({ rel, ...c }) => ({ ...c, t: starts[idx] + rel })),
  );
}
