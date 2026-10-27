import { describe, expect, it, vi } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import type { SongDownloadStatus } from '../../../../../lib/companion/songDownloadApi';
import {
  importRecording,
  matchSong,
  planImport,
  type ImportApi,
  type ImportInput,
} from '../youtubeImport';

const song = (
  id: string,
  audio: string | null,
  title = 'Hey Jude',
  scores: string[] = [],
): CompanionSong => ({
  id,
  title,
  artist: 'The Beatles',
  originalAudio: audio,
  audio: null,
  instrumentalAudio: null,
  cover: null,
  scores: scores.map((file) => ({ file, url: `/media?path=${file}`, hasMarks: false })),
  recordings: [],
});

const input = (over: Partial<ImportInput> = {}): ImportInput => ({
  title: 'hey jude',
  artist: 'the beatles!',
  youtubeUrl: 'https://youtu.be/x',
  scoreFile: new File(['<score-partwise/>'], 'jude.musicxml'),
  fromSong: null,
  ...over,
});

/** A fake server: `before` is listed until a download finishes, then `after`. */
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
    getSong: vi.fn(async (id: string) => songs.find((s) => s.id === id)!),
    uploadScore: vi.fn(async (id: string, file: File) => {
      const target = songs.find((s) => s.id === id)!;
      target.scores = [
        ...(target.scores ?? []),
        { file: file.name, url: `/media?path=${file.name}`, hasMarks: false },
      ];
      return { file: file.name };
    }),
    wait: vi.fn(async () => {}),
  };
  return { api };
}

describe('matchSong / planImport', () => {
  it('prefers the song the score on stage comes from over a name match', () => {
    const songs = [song('s1', null), song('s2', null, 'Other')];
    expect(matchSong(songs, 'Hey Jude', 'The Beatles', 's2')?.id).toBe('s2');
    expect(matchSong(songs, 'Hey Jude', 'The Beatles', 'gone')?.id).toBe('s1');
  });

  it('reuses a folder with a recording and downloads otherwise', () => {
    expect(planImport(song('s1', '/media?path=mix.mp3')).kind).toBe('reuse');
    expect(planImport(song('s1', null)).kind).toBe('download-into');
    expect(planImport(null).kind).toBe('download-new');
  });
});

describe('importRecording (#568: score and recording in one song folder)', () => {
  it('downloads into a new folder and uploads the score into it', async () => {
    const { api } = fakeApi(
      [],
      [song('new', '/media?path=mix.mp3')],
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
    const { api } = fakeApi([song('s1', null)], [song('s1', '/media?path=mix.mp3')], []);
    await importRecording(input(), undefined, api);
    expect(api.startDownload).toHaveBeenCalledWith(expect.objectContaining({ songId: 's1' }));
  });

  it('never replaces the recording of a matching folder', async () => {
    const existing = song('s1', '/media?path=mix.mp3');
    const { api } = fakeApi([existing], [existing], []);
    const result = await importRecording(input({ youtubeUrl: null }), undefined, api);
    expect(api.startDownload).not.toHaveBeenCalled();
    expect(result.score.file).toBe('jude.musicxml');
  });

  it('does not upload a score that already is in the song folder', async () => {
    const existing = song('s1', '/media?path=mix.mp3', 'Renamed', ['old.mxl']);
    const { api } = fakeApi([existing], [existing], []);
    const result = await importRecording(
      input({ youtubeUrl: null, fromSong: { songId: 's1', scoreFile: 'old.mxl' } }),
      undefined,
      api,
    );
    expect(api.startDownload).not.toHaveBeenCalled();
    expect(api.uploadScore).not.toHaveBeenCalled();
    expect(result.score.file).toBe('old.mxl');
  });

  it('downloads into a folder without .txt and keeps its score there (same id)', async () => {
    const { api } = fakeApi(
      [song('n1', null, 'Hey Jude', ['old.mxl'])],
      [song('n1', '/media?path=mix.mp3', 'Hey Jude', ['old.mxl'])],
      [{ status: 'done', progress: 100, error: null, songId: 'n1' }],
    );
    const result = await importRecording(
      input({ fromSong: { songId: 'n1', scoreFile: 'old.mxl' } }),
      undefined,
      api,
    );
    expect(api.startDownload).toHaveBeenCalledWith(expect.objectContaining({ songId: 'n1' }));
    expect(api.uploadScore).not.toHaveBeenCalled();
    expect(result.song.id).toBe('n1');
    expect(result.score.file).toBe('old.mxl');
  });

  it('finds the new folder by title when the server reports no song id', async () => {
    const { api } = fakeApi([], [song('new', '/media?path=mix.mp3')], []);
    expect((await importRecording(input(), undefined, api)).song.id).toBe('new');
  });

  it('reports a failed download', async () => {
    const { api } = fakeApi([], [], [{ status: 'error', progress: 10, error: 'yt-dlp failed' }]);
    await expect(importRecording(input(), undefined, api)).rejects.toThrow('yt-dlp failed');
    expect(api.uploadScore).not.toHaveBeenCalled();
  });

  it('stops polling when cancelled', async () => {
    const { api } = fakeApi([], [], [{ status: 'running', progress: 1, error: null }]);
    const ctrl = new AbortController();
    api.wait = vi.fn(async () => ctrl.abort());
    await expect(importRecording(input(), undefined, api, ctrl.signal)).rejects.toThrow(
      'cancelled',
    );
  });
});
