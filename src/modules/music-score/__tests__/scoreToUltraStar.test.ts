import { describe, expect, it } from 'vitest';
import {
  defaultUltraStarBpm,
  exportableVocalParts,
  parseUltraStarTxt,
  scoreToUltraStar,
  ultraStarToScore,
} from '..';
import type { BarMark, ScoreNote, ScoreSong } from '../types';

const SOLO = [
  '#TITLE:Song',
  '#ARTIST:Band',
  '#BPM:300',
  '#GAP:2000',
  ': 0 4 0 Hel',
  ': 4 4 2 lo',
  '* 8 4 4  world',
  '- 14',
  'F 16 2 5  free',
  ': 20 2 -3  rap',
  'R 24 2 0  gold',
  'E',
].join('\n');

const DUET = [
  '#TITLE:Duet',
  '#BPM:240',
  '#GAP:1000',
  '#DUETSINGERP1:Ann',
  '#DUETSINGERP2:Ben',
  'P1',
  ': 0 4 7 la',
  'P2',
  ': 4 4 -5 lu',
  'E',
].join('\n');

const lyricOf = (line: string) => line.split(' ').slice(4).join(' ');
const bodyLines = (txt: string) => txt.split('\n').filter((l) => /^[:*FRG-] /.test(l));

describe('scoreToUltraStar (#567)', () => {
  it('round trip keeps pitches, syllables, kinds, line breaks and times within one step', () => {
    const before = parseUltraStarTxt(SOLO);
    const { song, marks } = ultraStarToScore(before);
    const after = parseUltraStarTxt(scoreToUltraStar(song, 'P1', marks, { bpm: 300 }));
    expect(after.bpm).toBe(300);
    expect(Math.abs(after.gap - before.gap)).toBeLessThanOrEqual(1);
    const a = after.tracks[0].notes.filter((n) => n.type !== '-');
    const b = before.tracks[0].notes.filter((n) => n.type !== '-');
    expect(a.map((n) => [n.type, n.pitch, n.text.trim()])).toEqual(
      b.map((n) => [n.type, n.pitch, n.text.trim()]),
    );
    const breaks = (notes: { type: string; start: number }[]) =>
      notes.filter((n) => n.type === '-').map((n) => n.start);
    expect(breaks(after.tracks[0].notes)).toEqual(breaks(before.tracks[0].notes));
    expect(a[1].text).toBe('lo'); // the word continues: no leading space
    expect(a[2].text).toBe(' world'); // a new word
    a.forEach((n, i) => {
      expect(Math.abs(n.start - b[i].start)).toBeLessThanOrEqual(1);
      expect(Math.abs(n.duration - b[i].duration)).toBeLessThanOrEqual(1);
    });
  });

  it('writes the headers and follows another #BPM grid', () => {
    const { song, marks } = ultraStarToScore(parseUltraStarTxt(SOLO));
    const txt = scoreToUltraStar(song, 'P1', marks, { bpm: 150, mp3: 'mix.mp3' });
    expect(txt).toContain('#TITLE:Song');
    expect(txt).toContain('#ARTIST:Band');
    expect(txt).toContain('#MP3:mix.mp3');
    expect(txt).toContain('#BPM:150');
    expect(txt).toContain('#GAP:2000');
    // 4 beats at 300 are 2 beats at 150
    expect(parseUltraStarTxt(txt).tracks[0].notes[1].start).toBe(2);
  });

  it('refuses without bar marks', () => {
    const { song } = ultraStarToScore(parseUltraStarTxt(SOLO));
    expect(() => scoreToUltraStar(song, 'P1', null)).toThrow(/bar marks/);
    expect(() => scoreToUltraStar(song, 'P1', [{ beat: 0, sec: 0 }])).toThrow(/bar marks/);
  });

  it('refuses unknown parts and more than two parts', () => {
    const { song, marks } = ultraStarToScore(parseUltraStarTxt(SOLO));
    expect(() => scoreToUltraStar(song, 'X', marks)).toThrow(/not in the score/);
    expect(() => scoreToUltraStar(song, ['P1', 'P1', 'P1'], marks)).toThrow(/one or two/);
  });

  it('exports two parts as a duet', () => {
    const { song, marks } = ultraStarToScore(parseUltraStarTxt(DUET));
    expect(exportableVocalParts(song)).toHaveLength(2);
    const txt = scoreToUltraStar(song, ['P1', 'P2'], marks, { bpm: 240 });
    expect(txt).toMatch(/^P1$/m);
    expect(txt).toMatch(/^P2$/m);
    const out = parseUltraStarTxt(txt);
    expect(out.tracks.map((t) => t.name)).toEqual(['Ann', 'Ben']);
    expect(out.tracks[0].notes[0]).toMatchObject({ pitch: 7, start: 0, text: 'la' });
    expect(out.tracks[1].notes[0]).toMatchObject({ pitch: -5, start: 4, text: 'lu' });
  });

  describe('line breaks', () => {
    const note = (t: number, syl: string): ScoreNote => ({ t, dur: 1, pitch: 62, syl });
    // pauses: 3 beats (1.5 s) before "next", 0.5 s after "end." and before "new"
    const song: ScoreSong = {
      title: 'T',
      artist: 'A',
      source: 'x.musicxml',
      tempoMap: [{ beat: 0, bpm: 120 }],
      measureStarts: [0, 4, 8, 12],
      measureLengths: [4, 4, 4, 4],
      measureNumbers: [1, 2, 3, 4],
      end: 16,
      parts: [
        {
          id: 'V',
          name: 'Voice',
          isDrum: false,
          program: null,
          guess: 'vocals',
          notes: [note(0, 'Hel-'), note(1, 'lo'), note(5, 'next'), note(6, 'end.'), note(8, 'new')],
        },
      ],
    };
    const marks: BarMark[] = [0, 4, 8, 12, 16].map((beat) => ({ beat, sec: beat / 2 }));

    it('breaks at long pauses and, sooner, after sentence-ending punctuation', () => {
      const body = bodyLines(scoreToUltraStar(song, 'V', marks, { bpm: 240 }));
      const types = body.map((l) => l[0]);
      expect(types).toEqual([':', ':', '-', ':', ':', '-', ':']);
      expect(lyricOf(body[0])).toBe('Hel'); // line start: no leading space
      expect(lyricOf(body[1])).toBe('lo'); // word continues: no leading space
      expect(lyricOf(body[3])).toBe(' next'); // line start after the break
      expect(lyricOf(body[4])).toBe(' end.');
    });

    it('honours a configurable threshold', () => {
      const txt = scoreToUltraStar(song, 'V', marks, { bpm: 240, lineBreakGapSec: 10 });
      expect(bodyLines(txt).filter((l) => l.startsWith('-'))).toHaveLength(0);
    });

    it('prefers stored phrase breaks over the heuristic', () => {
      const withBreaks: ScoreSong = { ...song, parts: [{ ...song.parts[0], phraseBreaks: [1] }] };
      const body = bodyLines(scoreToUltraStar(withBreaks, 'V', marks, { bpm: 240 }));
      expect(body.map((l) => l[0])).toEqual([':', '-', ':', ':', ':', ':']);
    });
  });

  it('picks a fine default #BPM from the marks', () => {
    expect(
      defaultUltraStarBpm([
        { beat: 0, sec: 0 },
        { beat: 4, sec: 2 },
      ]),
    ).toBe(240);
    expect(
      defaultUltraStarBpm([
        { beat: 0, sec: 0 },
        { beat: 4, sec: 1 },
      ]),
    ).toBe(240);
  });
});
