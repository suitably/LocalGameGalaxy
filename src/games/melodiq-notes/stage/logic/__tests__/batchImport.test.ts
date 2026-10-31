import { describe, expect, it, vi } from 'vitest';
import type { ScoreSong } from '../../../../../modules/music-score';
import type { CompanionSong, StoredBarMarks } from '../../../../../lib/companion/songScoresApi';
import type { YouTubeResult } from '../../../../../lib/companion/songDownloadApi';
import {
  importScoreFile,
  replaceSongRecording,
  scoreMeta,
  topHit,
  type BatchApi,
} from '../batchImport';
import { canReplaceRecording } from '../songFileEdits';

const scoreSong = (title: string, artist = '') => ({ title, artist }) as ScoreSong;

const folder = (id: string, audio: string | null, over: Partial<CompanionSong> = {}) =>
  ({
    id,
    title: 'Hey Jude',
    artist: 'The Beatles',
    originalAudio: audio,
    audio: null,
    instrumentalAudio: null,
    cover: null,
    scores: [],
    recordings: [],
    ...over,
  }) as CompanionSong;

const hit = (url: string) => ({ url }) as YouTubeResult;
const marks = [
  { beat: 0, sec: 1 },
  { beat: 4, sec: 3 },
];

/** A fake server: a download fills the folder `id` (new or existing) with the mix `new.mp3`. */
function fakeApi(songs: CompanionSong[], parsed: ScoreSong, results = [hit('https://yt/1')]) {
  const saved: Record<string, StoredBarMarks> = {};
  const api: BatchApi = {
    listSongs: vi.fn(async () => songs),
    startDownload: vi.fn(async (req) => {
      const existing = songs.find((s) => s.id === req.songId);
      if (existing) existing.originalAudio = '/media?path=new.mp3';
      else
        songs.push(folder('new', '/media?path=new.mp3', { title: req.title, artist: req.artist }));
      return 'job';
    }),
    getStatus: vi.fn(async () => ({ status: 'done' as const, progress: 100, error: null })),
    getSong: vi.fn(async (id: string) => songs.find((s) => s.id === id)!),
    uploadScore: vi.fn(async (id: string, file: File) => {
      const s = songs.find((x) => x.id === id)!;
      s.scores = [
        ...(s.scores ?? []),
        { file: file.name, url: `/s/${file.name}`, hasMarks: false },
      ];
      return { file: file.name };
    }),
    wait: vi.fn(async () => {}),
    readScore: vi.fn(() => parsed),
    search: vi.fn(async () => results),
    fetchFile: vi.fn(async () => new ArrayBuffer(8)),
    getMarks: vi.fn(async (_id: string, file: string) => saved[file] ?? null),
    saveMarks: vi.fn(async (_id: string, file: string, m: StoredBarMarks) => {
      saved[file] = m;
    }),
    align: vi.fn(async () => marks),
  };
  return { api, saved };
}

const gp = (name = 'jude.gp') => new File(['x'], name);

describe('scoreMeta', () => {
  it('keeps what the score writes', () => {
    expect(scoreMeta(scoreSong('Hey Jude', 'The Beatles'), 'x.gp')).toEqual({
      title: 'Hey Jude',
      artist: 'The Beatles',
    });
  });
  it('splits "Artist - Title" from the file name when the score names no artist', () => {
    expect(scoreMeta(scoreSong('The Beatles - Hey Jude'), 'The Beatles - Hey Jude.mid')).toEqual({
      title: 'Hey Jude',
      artist: 'The Beatles',
    });
  });
  it('leaves the artist empty for a written title without artist', () => {
    expect(scoreMeta(scoreSong('Hey Jude'), 'A - B.musicxml').artist).toBe('');
  });
});

describe('importScoreFile', () => {
  it('downloads the top hit into a new folder, stores and aligns the score', async () => {
    const { api, saved } = fakeApi([], scoreSong('Hey Jude', 'The Beatles'), [
      hit('https://yt/1'),
      hit('https://yt/2'),
    ]);
    const result = await importScoreFile(gp(), api);
    expect(topHit([])).toBeNull();
    expect(api.search).toHaveBeenCalledWith('The Beatles Hey Jude');
    expect(api.startDownload).toHaveBeenCalledWith(
      expect.objectContaining({ youtubeUrl: 'https://yt/1' }),
    );
    expect(result).toEqual({
      songId: 'new',
      title: 'Hey Jude',
      artist: 'The Beatles',
      aligned: true,
    });
    expect(saved['jude.gp']).toEqual({ marks, offsetSec: 0, audio: null });
  });

  it('reuses a folder that has a recording without searching', async () => {
    const { api } = fakeApi(
      [folder('f1', '/media?path=mix.mp3')],
      scoreSong('hey jude', 'the beatles'),
    );
    const result = await importScoreFile(gp(), api);
    expect(api.search).not.toHaveBeenCalled();
    expect(api.startDownload).not.toHaveBeenCalled();
    expect(result.songId).toBe('f1');
  });

  it('fails without an artist or without a hit', async () => {
    await expect(importScoreFile(gp(), fakeApi([], scoreSong('Hey Jude')).api)).rejects.toThrow(
      'no artist',
    );
    const { api } = fakeApi([], scoreSong('Hey Jude', 'The Beatles'), []);
    await expect(importScoreFile(gp(), api)).rejects.toThrow('no recording');
  });

  it('reports a score that could not be aligned', async () => {
    const { api } = fakeApi([folder('f1', '/m.mp3')], scoreSong('Hey Jude', 'The Beatles'));
    api.align = vi.fn(async () => []);
    expect((await importScoreFile(gp(), api)).aligned).toBe(false);
    expect(api.saveMarks).not.toHaveBeenCalled();
  });
});

describe('replaceSongRecording', () => {
  it('downloads into the folder and realigns only scores of the mix', async () => {
    const song = folder('f1', '/media?path=old.mp3', {
      scores: [
        { file: 'a.gp', url: '/s/a.gp', hasMarks: true },
        { file: 'b.gp', url: '/s/b.gp', hasMarks: true },
        { file: 'c.mid', url: '/s/c.mid', hasMarks: false },
      ],
    });
    const { api, saved } = fakeApi([song], scoreSong('Hey Jude', 'The Beatles'));
    saved['a.gp'] = { marks, offsetSec: 0.2, audio: null };
    saved['b.gp'] = { marks, offsetSec: 0, audio: 'take1.mp3' };
    const result = await replaceSongRecording(song, 'https://yt/9', api);
    expect(api.startDownload).toHaveBeenCalledWith(
      expect.objectContaining({ songId: 'f1', youtubeUrl: 'https://yt/9' }),
    );
    expect(result.aligned).toBe(2);
    expect(saved['a.gp'].offsetSec).toBe(0);
    expect(saved['b.gp'].audio).toBe('take1.mp3');
    expect(saved['c.mid'].audio).toBeNull();
  });
});

describe('canReplaceRecording', () => {
  it('blocks a karaoke .txt with notes, allows headers only', () => {
    expect(canReplaceRecording(folder('a', null, { txtContent: '#TITLE:x\n: 0 4 5 Hey\nE' }))).toBe(
      false,
    );
    expect(canReplaceRecording(folder('a', null, { txtContent: '#TITLE:x\n#GAP:0\nE' }))).toBe(
      true,
    );
    expect(canReplaceRecording(folder('a', null))).toBe(true);
  });
});
