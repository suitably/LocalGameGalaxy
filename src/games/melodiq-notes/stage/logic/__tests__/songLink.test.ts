import { describe, expect, it } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import { MAX_SONG_CHOICES, defaultSongChoice, rankSongChoices } from '../songLink';

const song = (id: string, artist: string, title: string): CompanionSong => ({
  id,
  title,
  artist,
  originalAudio: null,
  audio: null,
  instrumentalAudio: null,
  cover: null,
});

const songs = [
  song('a', 'Zed', 'Alpha'),
  song('b', 'Band', 'Song'),
  song('c', 'Abba', 'Waterloo'),
  song('d', 'BAND', 'Song!'),
];

describe('rankSongChoices (#563)', () => {
  it('puts the same normalised artist + title first, then all songs by name', () => {
    const ids = rankSongChoices(songs, { title: 'song', artist: 'band' }, '').map((c) => [
      c.song.id,
      c.exact,
    ]);
    expect(ids).toEqual([
      ['b', true],
      ['d', true],
      ['c', false],
      ['a', false],
    ]);
  });

  it('filters the others by every query word but keeps exact matches', () => {
    const ids = rankSongChoices(songs, { title: 'Song', artist: 'Band' }, 'abba water').map(
      (c) => c.song.id,
    );
    expect(ids).toEqual(['b', 'd', 'c']);
  });

  it('leaves out the excluded song and an empty title never matches exactly', () => {
    const choices = rankSongChoices(songs, { title: '', artist: '' }, '', 'b');
    expect(choices.map((c) => c.song.id)).not.toContain('b');
    expect(choices.some((c) => c.exact)).toBe(false);
    expect(defaultSongChoice(choices)).toBeNull();
  });

  it('pre-selects the first exact match and caps the list', () => {
    expect(defaultSongChoice(rankSongChoices(songs, { title: 'Song', artist: 'Band' }, ''))).toBe(
      'b',
    );
    const many = Array.from({ length: 80 }, (_, i) => song(`s${i}`, 'X', `T${i}`));
    expect(rankSongChoices(many, { title: 'n', artist: '' }, '')).toHaveLength(MAX_SONG_CHOICES);
  });
});
