import { describe, expect, it, vi } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import {
  buildScoreCatalog,
  catalogKey,
  findSongFolder,
  loadScoreCatalog,
  matchesQuery,
  scoreFormatOf,
} from '../scoreCatalog';
import { pickRecording } from '../../serverScoreLoad';

const song = (
  id: string,
  title: string,
  artist: string,
  over: Partial<CompanionSong> = {},
): CompanionSong => ({
  id,
  title,
  artist,
  originalAudio: null,
  audio: null,
  instrumentalAudio: null,
  cover: null,
  scores: [],
  recordings: [],
  ...over,
});

const media = (file: string) => `/media?path=${encodeURIComponent(`/songs/${file}`)}&token=t`;
const score = (file: string, label: string | null = null) => ({
  file,
  url: media(file),
  hasMarks: false,
  label,
});
const karaokeTxt = '#BPM:120\n: 0 4 0 la\nE';

describe('buildScoreCatalog (#568: one entry per song folder)', () => {
  it('lists a karaoke song with several scores, its mix and Notes recordings as one entry', () => {
    const [entry, ...rest] = buildScoreCatalog([
      song('s1', 'Mr. Brightside', 'The Killers', {
        karaoke: true,
        txtContent: karaokeTxt,
        originalAudio: media('mix.mp3'),
        scores: [score('Beginner.mxl'), score('Band.mxl', 'Full band')],
        recordings: [{ file: 'Take.webm', url: media('Take.webm') }],
      }),
    ]);
    expect(rest).toHaveLength(0);
    expect(entry.key).toBe('s1');
    expect(entry.karaoke?.id).toBe('s1');
    expect(entry.recordings).toBe(2);
    expect(entry.scores.map((s) => [s.file, s.label])).toEqual([
      ['Beginner.mxl', null],
      ['Band.mxl', 'Full band'],
    ]);
    // every score plays with the same song (and so the same mix)
    expect(entry.scores.every((s) => s.song.id === 's1')).toBe(true);
  });

  it('lists songs without .txt (sheet music only) without karaoke vocals', () => {
    const [entry] = buildScoreCatalog([
      song('n1', 'Etude', 'Chopin', { karaoke: false, scores: [score('Etude.mxl')] }),
    ]);
    expect(entry.karaoke).toBeNull();
    expect(entry.recordings).toBe(0);
    expect(entry.scores).toHaveLength(1);
  });

  it('keeps a karaoke song without scores, and copes with older servers (no lists)', () => {
    const old: CompanionSong = {
      id: 'k1',
      title: 'Alone',
      artist: 'A',
      originalAudio: null,
      audio: media('a.mp3'),
      instrumentalAudio: null,
      cover: null,
      txtContent: karaokeTxt,
    };
    const [entry] = buildScoreCatalog([old]);
    expect(entry).toMatchObject({ scores: [], recordings: 1 });
    expect(entry.karaoke?.id).toBe('k1');
  });

  it('keys songs the server gave the same id apart, so a list can render each once', () => {
    const entries = buildScoreCatalog([
      song('dup', 'Mann im Mond', 'Die Prinzen'),
      song('dup', 'Mann im Mond', 'Die Prinzen'),
      song('dup', 'Mann im Mond', 'Die Prinzen'),
      song('other', 'Etude', 'Chopin'),
    ]);
    expect(entries.map((e) => e.key).sort()).toEqual(['dup', 'dup#2', 'dup#3', 'other']);
    expect(entries.filter((e) => e.song.id === 'dup')).toHaveLength(3);
  });

  it('lists songs with the same artist and title on their own', () => {
    const entries = buildScoreCatalog([
      song('a', 'Hey Jude', 'The Beatles'),
      song('b', 'hey  jude!', 'the beatles'),
    ]);
    expect(entries.map((e) => e.key).sort()).toEqual(['a', 'b']);
  });

  it('sorts by artist and title and ignores accents and case in the key', () => {
    const entries = buildScoreCatalog([song('1', 'Zebra', 'B'), song('2', 'Alpha', 'B')]);
    expect(entries.map((e) => e.title)).toEqual(['Alpha', 'Zebra']);
    expect(catalogKey('Café', 'Björk')).toBe(catalogKey('cafe', 'BJORK'));
  });

  it('matches every query word, ignoring case, accents and an empty query', () => {
    expect(matchesQuery('The Beatles Hey Jude', 'beatles JUDE')).toBe(true);
    expect(matchesQuery('Björk Army of Me', 'bjork army')).toBe(true);
    expect(matchesQuery('The Beatles Hey Jude', 'beatles yes')).toBe(false);
    expect(matchesQuery('anything', ' ')).toBe(true);
  });

  it('tells the format by the file extension', () => {
    expect(['a.mxl', 'a.musicxml', 'a.XML'].map(scoreFormatOf)).toEqual([
      'musicxml',
      'musicxml',
      'musicxml',
    ]);
    expect(['a.mid', 'a.MIDI'].map(scoreFormatOf)).toEqual(['midi', 'midi']);
    expect(scoreFormatOf('a.GP')).toBe('guitarpro');
  });

  it('lists scores, then the karaoke vocals, as playable items with format and instruments', () => {
    const [entry] = buildScoreCatalog([
      song('s1', 'Arctic Song', 'Arctic Monkeys', {
        txtContent: karaokeTxt,
        scores: [
          score('Arctic_Monkeys_Bass_Guitar.mid'),
          score('x.mxl', 'Piano Vocal'),
          score('Full.gp'),
        ],
      }),
    ]);
    expect(entry.items.map((i) => [i.kind, i.format, i.instruments])).toEqual([
      ['score', 'midi', ['bass']],
      ['score', 'musicxml', ['vocals', 'keyboard']],
      // "Monkeys" in the artist is no keyboard ("keys")
      ['score', 'guitarpro', []],
      ['karaoke', 'txt', ['vocals']],
    ]);
  });

  it('finds the song folder with the same artist and title', () => {
    const songs = [song('s1', 'Hey Jude', 'The Beatles')];
    expect(findSongFolder(songs, 'HEY  jude', 'the beatles')?.id).toBe('s1');
    expect(findSongFolder(songs, 'Let It Be', 'The Beatles')).toBeNull();
  });
});

describe('loadScoreCatalog', () => {
  it('reads every song folder once', async () => {
    const listSongs = vi.fn(async () => [song('s1', 'T', 'A')]);
    const entries = await loadScoreCatalog(listSongs);
    expect(listSongs).toHaveBeenCalledTimes(1);
    expect(entries.map((e) => e.key)).toEqual(['s1']);
  });

  it('passes a server error on', async () => {
    await expect(loadScoreCatalog(() => Promise.reject(new Error('down')))).rejects.toThrow('down');
  });
});

describe('pickRecording', () => {
  const marks = {
    marks: [
      { beat: 0, sec: 0 },
      { beat: 4, sec: 2 },
    ],
    offsetSec: 0,
  };
  const withMix = song('s1', 'T', 'A', {
    originalAudio: media('mix.mp3'),
    recordings: [{ file: 'take.mp3', url: media('take.mp3') }],
  });

  it('plays the song folder recording the marks name', () => {
    const r = pickRecording(withMix, { ...marks, audio: 'take.mp3' });
    expect(r.recording?.name).toBe('take.mp3');
    expect(r.recording?.songMix).toBeUndefined();
    expect(r.marks?.audio).toBe('take.mp3');
  });

  it('plays the song mix with marks that name no other recording', () => {
    const r = pickRecording(withMix, { ...marks, audio: null });
    expect(r.recording).toMatchObject({ songMix: true, local: false });
    expect(r.marks).not.toBeNull();
  });

  it('falls back to the first recording without marks when there is no mix', () => {
    const noMix = { ...withMix, originalAudio: null };
    const r = pickRecording(noMix, { ...marks, audio: 'gone.mp3' });
    expect(r.recording?.name).toBe('take.mp3');
    expect(r.marks).toBeNull();
  });
});
