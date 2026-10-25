import { describe, expect, it, vi } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import type { SongDownloadStatus } from '../../../../../lib/companion/songDownloadApi';
import {
  findSongFolder,
  importRecording,
  planImport,
  type ImportApi,
  type ImportInput,
} from '../youtubeImport';

const song = (id: string, audio: string | null, scores: string[] = []): CompanionSong => ({
  id,
  title: 'Hey Jude',
  artist: 'The Beatles',
  originalAudio: audio,
  audio: null,
  instrumentalAudio: null,
  cover: null,
  scores: scores.map((file) => ({ file, url: `/media?path=${file}`, hasMarks: false })),
});

const input = (over: Partial<ImportInput> = {}): ImportInput => ({
  title: 'hey jude',
  artist: 'the beatles!',
  youtubeUrl: 'https://youtu.be/x',
  scoreFile: new File(['<score-partwise/>'], 'jude.musicxml'),
  fromSong: null,
  ...over,
});

/** A fake server: `before` is listed until a download or upload changes it to `after`. */
function fakeApi(before: CompanionSong[], after: CompanionSong[], statuses: SongDownloadStatus[]) {
  let songs = before;
  const api: ImportApi = {
    listSongs: vi.fn(async () => songs),
    startDownload: vi.fn(async () => 'job1'),
    getStatus: vi.fn(async () => {
      const next = statuses.shift() ?? { status: 'done', progress: 100, error: null };
      if (next.status === 'done') songs = after;
      return next;
    }),
    uploadScore: vi.fn(async () => {
      songs = after;
      return { file: 'jude.musicxml' };
    }),
    wait: vi.fn(async () => {}),
  };
  return api;
}

describe('findSongFolder / planImport', () => {
  it('matches artist and title like the score library does', () => {
    expect(findSongFolder([song('s1', null)], 'HEY  jude', 'the beatles')?.id).toBe('s1');
    expect(findSongFolder([song('s1', null)], 'Let It Be', 'The Beatles')).toBeNull();
  });

  it('reuses a folder with a recording and downloads otherwise', () => {
    expect(planImport(song('s1', '/media?path=mix.mp3')).kind).toBe('reuse');
    expect(planImport(song('s1', null)).kind).toBe('download-into');
    expect(planImport(null).kind).toBe('download-new');
  });
});

describe('importRecording', () => {
  it('downloads into a new folder, stores the score there and returns both', async () => {
    const api = fakeApi(
      [],
      [song('new', '/media?path=mix.mp3', ['jude.musicxml'])],
      [
        { status: 'running', progress: 40, error: null },
        { status: 'done', progress: 100, error: null, songId: 'new' },
      ],
    );
    const progress = vi.fn();
    const result = await importRecording(input(), progress, api);
    expect(api.startDownload).toHaveBeenCalledWith({
      artist: 'the beatles!',
      title: 'hey jude',
      youtubeUrl: 'https://youtu.be/x',
    });
    expect(api.wait).toHaveBeenCalledTimes(1);
    expect(api.uploadScore).toHaveBeenCalledWith('new', expect.any(File));
    expect(result.song.id).toBe('new');
    expect(result.score.file).toBe('jude.musicxml');
    expect(progress).toHaveBeenCalledWith({ stage: 'download', status: 'running', progress: 40 });
  });

  it('downloads into a matching folder without a recording', async () => {
    const api = fakeApi(
      [song('s1', null)],
      [song('s1', '/media?path=mix.mp3', ['jude.musicxml'])],
      [],
    );
    await importRecording(input(), undefined, api);
    expect(api.startDownload).toHaveBeenCalledWith(expect.objectContaining({ songId: 's1' }));
  });

  it('never replaces the recording of a matching folder', async () => {
    const api = fakeApi(
      [song('s1', '/media?path=mix.mp3')],
      [song('s1', '/media?path=mix.mp3', ['jude.musicxml'])],
      [],
    );
    const result = await importRecording(input({ youtubeUrl: null }), undefined, api);
    expect(api.startDownload).not.toHaveBeenCalled();
    expect(result.score.file).toBe('jude.musicxml');
  });

  it('does not upload a score that already is in the folder', async () => {
    const existing = song('s1', '/media?path=mix.mp3', ['old.mxl']);
    const api = fakeApi([existing], [existing], []);
    const result = await importRecording(
      input({ fromSong: { songId: 's1', scoreFile: 'old.mxl' } }),
      undefined,
      api,
    );
    expect(api.uploadScore).not.toHaveBeenCalled();
    expect(result.score.file).toBe('old.mxl');
  });

  it('finds the new folder by title when the server reports no song id', async () => {
    const api = fakeApi([], [song('new', '/media?path=mix.mp3', ['jude.musicxml'])], []);
    expect((await importRecording(input(), undefined, api)).song.id).toBe('new');
  });

  it('reports a failed download', async () => {
    const api = fakeApi([], [], [{ status: 'error', progress: 10, error: 'yt-dlp failed' }]);
    await expect(importRecording(input(), undefined, api)).rejects.toThrow('yt-dlp failed');
    expect(api.uploadScore).not.toHaveBeenCalled();
  });

  it('stops polling when cancelled', async () => {
    const api = fakeApi([], [], [{ status: 'running', progress: 1, error: null }]);
    const ctrl = new AbortController();
    api.wait = vi.fn(async () => ctrl.abort());
    await expect(importRecording(input(), undefined, api, ctrl.signal)).rejects.toThrow(
      'cancelled',
    );
  });
});
