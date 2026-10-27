import { describe, expect, it } from 'vitest';
import { parseUltraStarTxt, ultraStarToScore } from '../../../../../modules/music-score';
import { buildUltraStarFile, DUET_CHOICE, ultraStarChoices } from '../ultraStarExport';

const TXT = [
  '#TITLE:Duet',
  '#ARTIST:Pair',
  '#BPM:240',
  '#GAP:1000',
  'P1',
  ': 0 4 7 la',
  'P2',
  ': 4 4 -5 lu',
  'E',
].join('\n');

describe('buildUltraStarFile (#567)', () => {
  const { song, marks } = ultraStarToScore(parseUltraStarTxt(TXT));

  it('offers the vocal parts and a duet for exactly two', () => {
    expect(ultraStarChoices(song).parts.map((p) => p.id)).toEqual(['P1', 'P2']);
    expect(ultraStarChoices(song).duet).toBe(true);
    expect(ultraStarChoices(null).parts).toEqual([]);
  });

  it('exports one part, shifted by the offset, named after artist and title', () => {
    const file = buildUltraStarFile(song, marks, 0.5, 'P2', 'mix.mp3');
    expect(file.name).toBe('Pair - Duet.txt');
    const out = parseUltraStarTxt(file.text);
    expect(out.headers.MP3).toBe('mix.mp3');
    expect(out.tracks).toHaveLength(1);
    expect(out.tracks[0].notes[0]).toMatchObject({ pitch: -5, text: 'lu' });
    expect(out.gap).toBe(1750); // #GAP 1000 + one quarter (250 ms) + offset 500 ms
  });

  it('exports both parts as a duet', () => {
    const out = parseUltraStarTxt(buildUltraStarFile(song, marks, 0, DUET_CHOICE).text);
    expect(out.tracks).toHaveLength(2);
  });

  it('refuses without marks', () => {
    expect(() => buildUltraStarFile(song, null, 0, 'P1')).toThrow(/bar marks/);
  });
});
