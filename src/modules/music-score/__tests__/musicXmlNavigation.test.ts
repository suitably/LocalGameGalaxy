import { describe, it, expect } from 'vitest';
import { parseMusicXml } from '../musicXml';
import { playOrder } from '../musicXmlBars';
import { parseXml } from './fixtures';

const note = (step: string, duration: number, extra = '') =>
  `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration><voice>1</voice>${extra}</note>`;
const lyric = (n: number, txt: string, syllabic = 'single') =>
  `<lyric number="${n}"><syllabic>${syllabic}</syllabic><text>${txt}</text></lyric>`;
const sound = (attrs: string) => `<direction><sound ${attrs}/></direction>`;
const FORWARD = '<barline location="left"><repeat direction="forward"/></barline>';
const BACKWARD = '<barline location="right"><repeat direction="backward"/></barline>';
const WHOLE = note('C', 4);

/** One-part 4/4 score; the first bar carries the attributes. */
function score(measures: string[], divisions = 1): string {
  const body = measures
    .map((m, i) => {
      const attrs =
        i === 0
          ? `<attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>`
          : '';
      return `<measure number="${i + 1}">${attrs}${m}</measure>`;
    })
    .join('');
  return `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
}
const parse = (measures: string[]) => parseMusicXml(score(measures), 'nav.musicxml', parseXml);

describe('multi-verse lyrics', () => {
  it('sings verse 1 on the first pass of a repeat and verse 2 on the second', () => {
    const song = parse([
      FORWARD +
        note('C', 2, lyric(1, 'Hel', 'begin') + lyric(2, 'Good', 'begin')) +
        note('D', 2, lyric(1, 'lo', 'end') + lyric(2, 'bye', 'end')) +
        BACKWARD,
      note('E', 4, lyric(1, 'end')),
    ]);
    const notes = song.parts[0].notes.map((n) => [n.t, n.syl]);
    expect(notes).toEqual([
      [0, 'Hel-'],
      [2, 'lo'],
      [4, 'Good-'],
      [6, 'bye'],
      [8, 'end'],
    ]);
  });

  it('repeats a chorus written once and leaves verse-2-only notes silent in verse 1', () => {
    const song = parse([
      FORWARD + note('C', 2, lyric(1, 'la')) + note('D', 2, lyric(1, 'la')) + BACKWARD,
      FORWARD + note('E', 2, lyric(1, 'one')) + note('F', 2, lyric(2, 'and')) + BACKWARD,
    ]);
    expect(song.parts[0].notes.map((n) => n.syl ?? '')).toEqual([
      'la',
      'la',
      'la',
      'la',
      'one',
      '',
      '',
      'and',
    ]);
  });
});

describe('D.C. / D.S. / coda / fine navigation', () => {
  it('plays D.S. al Coda in the expected bar order', () => {
    const song = parse([
      WHOLE,
      '<direction><direction-type><segno/></direction-type><sound segno="segno"/></direction>' +
        WHOLE,
      WHOLE +
        '<direction><direction-type><words>To Coda</words></direction-type><sound tocoda="coda"/></direction>',
      WHOLE,
      WHOLE +
        '<direction><direction-type><words>D.S. al Coda</words></direction-type><sound dalsegno="segno"/></direction>',
      '<direction><direction-type><coda/></direction-type><sound coda="coda"/></direction>' + WHOLE,
    ]);
    expect(song.measureNumbers).toEqual([1, 2, 3, 4, 5, 2, 3, 6]);
    expect(song.end).toBe(32);
    expect(song.parts[0].notes).toHaveLength(8);
  });

  it('plays D.C. al Fine without taking the repeat again', () => {
    const song = parse([
      FORWARD + WHOLE,
      WHOLE + sound('fine="yes"') + BACKWARD,
      WHOLE + sound('dacapo="yes"'),
    ]);
    expect(song.measureNumbers).toEqual([1, 2, 1, 2, 3, 1, 2]);
  });

  it('reads plain "D.C." / "Fine" words when the score has no <sound> marks', () => {
    const words = (w: string) =>
      `<direction><direction-type><words>${w}</words></direction-type></direction>`;
    const song = parse([WHOLE + words('Fine'), WHOLE + words('D.C. al Fine')]);
    expect(song.measureNumbers).toEqual([1, 2, 1]);
  });

  it('plays through to the end after a D.S., takes only the final ending, and ignores a D.S. without segno', () => {
    const bars = [
      { forward: true, backward: false, times: 2, endings: null, nav: { segno: '' } },
      { forward: false, backward: true, times: 2, endings: [1] },
      { forward: false, backward: false, times: 2, endings: [2] },
      { forward: false, backward: false, times: 2, endings: null, nav: { dalsegno: '' } },
    ];
    expect(playOrder(bars)).toEqual([0, 1, 0, 2, 3, 0, 2, 3]);
    const noSegno = bars.map((b) => ({ ...b, nav: b.nav?.dalsegno !== undefined ? b.nav : null }));
    expect(playOrder(noSegno)).toEqual([0, 1, 0, 2, 3]);
  });
});

describe('<harmony> chord symbols', () => {
  const harmony = (inner: string) => `<harmony>${inner}</harmony>`;
  const song = parseMusicXml(
    score(
      [
        FORWARD +
          harmony('<root><root-step>C</root-step></root><kind>major</kind>') +
          note('C', 4) +
          harmony(
            '<root><root-step>G</root-step></root><kind>dominant</kind><bass><bass-step>B</bass-step></bass>',
          ) +
          harmony(
            '<root><root-step>F</root-step><root-alter>1</root-alter></root><kind text="m7">minor-seventh</kind><offset>1</offset>',
          ) +
          note('D', 4) +
          BACKWARD,
        harmony('<kind>none</kind>') + note('C', 8),
      ],
      2,
    ),
    'chords.musicxml',
    parseXml,
  );

  it('yields chord symbols at the right beats, repeats written out', () => {
    expect(song.chords?.map((c) => [c.t, c.symbol])).toEqual([
      [0, 'C'],
      [2, 'G7/B'],
      [2.5, 'F#m7'],
      [4, 'C'],
      [6, 'G7/B'],
      [6.5, 'F#m7'],
      [8, 'N.C.'],
    ]);
  });

  it('keeps root, bass and kind for chord / strum modes', () => {
    expect(song.chords?.[1]).toEqual({ t: 2, symbol: 'G7/B', root: 7, bass: 11, kind: 'dominant' });
    expect(song.chords?.[6]).toMatchObject({ root: null, kind: 'none' });
  });

  it('leaves chords out of songs without <harmony>', () => {
    expect(parse([WHOLE]).chords).toBeUndefined();
  });
});
