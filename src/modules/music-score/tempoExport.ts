import type { BarMark, ScoreSong, XmlParser } from './types';

export type XmlSerializer = (doc: Document) => string;

const AUDIO_OFFSET_FIELD = 'melodiq-audio-offset';

/**
 * Tempo of every written bar so the score plays along with the recording.
 * A bar played several times (repeats) gets the average of its passes.
 */
export function barTemposFromMarks(song: ScoreSong, marks: BarMark[]): Map<number, number> {
  const sums = new Map<number, { sum: number; n: number }>();
  song.measureStarts.forEach((start, idx) => {
    const len = song.measureLengths[idx];
    const a = marks.find((m) => Math.abs(m.beat - start) < 1e-6);
    const b = marks.find((m) => Math.abs(m.beat - (start + len)) < 1e-6);
    if (!a || !b || b.sec <= a.sec) return;
    const bpm = (len * 60) / (b.sec - a.sec);
    const bar = song.measureNumbers[idx];
    const s = sums.get(bar) ?? { sum: 0, n: 0 };
    sums.set(bar, { sum: s.sum + bpm, n: s.n + 1 });
  });
  const out = new Map<number, number>();
  for (const [bar, s] of sums) out.set(bar, Math.round((s.sum / s.n) * 100) / 100);
  return out;
}

const childElements = (el: Element, tag: string): Element[] => {
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n as Element).tagName === tag) out.push(n as Element);
  }
  return out;
};

/**
 * Writes the recording's tempo into the score: every bar of the first part gets
 * a <sound tempo> matching the bar marks, old tempo sounds are removed, and the
 * start of bar 1 in the recording is stored as a miscellaneous field.
 * The result opens in MuseScore and plays in time with the recording.
 */
export function applyBarMarksToMusicXml(
  xml: string,
  song: ScoreSong,
  marks: BarMark[],
  parseXml: XmlParser,
  serialize: XmlSerializer,
): string {
  const doc = parseXml(xml);
  const root = doc.documentElement;
  const tempos = barTemposFromMarks(song, marks);

  for (const s of Array.from(root.getElementsByTagName('sound'))) {
    if (!s.hasAttribute('tempo')) continue;
    s.removeAttribute('tempo');
    if (!s.attributes.length && !s.firstChild) s.parentNode?.removeChild(s);
  }

  const firstPart = childElements(root, 'part')[0];
  if (firstPart) {
    let previous: number | null = null;
    childElements(firstPart, 'measure').forEach((m, i) => {
      const bpm = tempos.get(i + 1);
      if (!bpm || (previous !== null && Math.abs(bpm - previous) < 0.5)) return;
      previous = bpm;
      const sound = doc.createElement('sound');
      sound.setAttribute('tempo', String(bpm));
      const attrs = childElements(m, 'attributes')[0];
      m.insertBefore(sound, attrs ? attrs.nextSibling : m.firstChild);
    });
  }

  const startSec = marks[0]?.sec ?? 0;
  let ident = childElements(root, 'identification')[0];
  if (!ident) {
    ident = doc.createElement('identification');
    const partList = childElements(root, 'part-list')[0];
    root.insertBefore(ident, partList ?? root.firstChild);
  }
  let misc = childElements(ident, 'miscellaneous')[0];
  if (!misc) {
    misc = doc.createElement('miscellaneous');
    ident.appendChild(misc);
  }
  for (const f of childElements(misc, 'miscellaneous-field')) {
    if (f.getAttribute('name') === AUDIO_OFFSET_FIELD) misc.removeChild(f);
  }
  const field = doc.createElement('miscellaneous-field');
  field.setAttribute('name', AUDIO_OFFSET_FIELD);
  field.appendChild(doc.createTextNode(startSec.toFixed(3)));
  misc.appendChild(field);

  return serialize(doc);
}

/** Reads the recording offset written by applyBarMarksToMusicXml, if present. */
export function readAudioOffset(xml: string): number | null {
  const m = xml.match(new RegExp(`<miscellaneous-field name="${AUDIO_OFFSET_FIELD}">([^<]+)<`));
  return m ? Number(m[1]) : null;
}
