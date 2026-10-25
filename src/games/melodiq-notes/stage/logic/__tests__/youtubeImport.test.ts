import { describe, expect, it, vi } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import type { NotesPiece } from '../../../../../lib/companion/notesLibraryApi';
import type { SongDownloadStatus } from '../../../../../lib/companion/songDownloadApi';
import {
  findSongFolder,
  importRecording,
  matchSong,
  planImport,
  type ImportApi,
  type ImportInput,
} from '../youtubeImport';

const song = (id: string, audio: string | null, title = 'Hey Jude'): CompanionSong => ({
  id,
  title,
  artist: 'The Beatles',
  originalAudio: audio,
  audio: null,
  instrumentalAudio: null,
  cover: null,
});

const input = (over: Partial<ImportInput> = {}): ImportInput => ({
  title: 'hey jude',
  artist: 'the beatles!',
  youtubeUrl: 'https://youtu.be/x',
  scoreFile: new File(['<score-partwise/>'], 'jude.musicxml'),
  fromPiece: null,
  ...over,
});

/**
 * A fake server: `before` is listed until a download finishes, then `after`; Notes pieces live in
 * `pieces` (one, `old`, with the score `old.mxl`, exists from the start).
 */
function fakeApi(before: CompanionSong[], after: CompanionSong[], statuses: SongDownloadStatus[]) {
  let songs = before;
  const pieces = new Map<string, NotesPiece>([
    [
      'old',
      {
        id: 'old',
        title: 'Hey Jude (piano)',
        artist: 'The Beatles',
        songId: null,
        updatedAt: 0,
        scores: [{ file: 'old.mxl', url: '/notes/media/old/old.mxl', hasMarks: false }],
        recordings: [],
      },
    ],
  ]);
  const api: ImportApi = {
    listSongs: vi.fn(async () => songs),
    startDownload: vi.fn(async () => 'job1'),
    getStatus: vi.fn(async () => {
      const next = statuses.shift() ?? { status: 'done', progress: 100, error: null };
      if (next.status === 'done') songs = after;
      return next;
    }),
    createPiece: vi.fn(async (meta) => {
      const created: NotesPiece = {
        id: 'p1',
        title: meta.title,
        artist: meta.artist,
        songId: meta.songId ?? null,
        updatedAt: 0,
        scores: [],
        recordings: [],
      };
      pieces.set(created.id, created);
      return created;
    }),
    getPiece: vi.fn(async (id: string) => pieces.get(id)!),
    updatePiece: vi.fn(async (id, meta) => {
      const updated = { ...pieces.get(id)!, ...meta };
      pieces.set(id, updated);
      return updated;
    }),
    uploadScore: vi.fn(async (id: string, file: File) => {
      const p = pieces.get(id)!;
      p.scores.push({ file: file.name, url: `/notes/media/${id}/${file.name}`, hasMarks: false });
      return { file: file.name };
    }),
    wait: vi.fn(async () => {}),
  };
  return { api, pieces };
}

describe('findSongFolder / matchSong / planImport', () => {
  it('matches artist and title like the score library does', () => {
    expect(findSongFolder([song('s1', null)], 'HEY  jude', 'the beatles')?.id).toBe('s1');
    expect(findSongFolder([song('s1', null)], 'Let It Be', 'The Beatles')).toBeNull();
  });

  it('prefers the song a piece is linked to over a name match', () => {
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

describe('importRecording', () => {
  it('downloads into a new folder and stores the score as a Notes piece linked to it', async () => {
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
    expect(api.createPiece).toHaveBeenCalledWith({
      title: 'hey jude',
      artist: 'the beatles!',
      songId: 'new',
    });
    expect(api.uploadScore).toHaveBeenCalledWith('p1', expect.any(File));
    expect(result.song.id).toBe('new');
    expect(result.piece.songId).toBe('new');
    expect(result.score.file).toBe('jude.musicxml');
    expect(progress).toHaveBeenCalledWith({ stage: 'download', status: 'running', progress: 40 });
  });

  it('downloads into a matching folder without a recording', async () => {
    const { api } = fakeApi([song('s1', null)], [song('s1', '/media?path=mix.mp3')], []);
    await importRecording(input(), undefined, api);
    expect(api.startDownload).toHaveBeenCalledWith(expect.objectContaining({ songId: 's1' }));
  });

  it('never replaces the recording of a matching folder', async () => {
    const { api } = fakeApi(
      [song('s1', '/media?path=mix.mp3')],
      [song('s1', '/media?path=mix.mp3')],
      [],
    );
    const result = await importRecording(input({ youtubeUrl: null }), undefined, api);
    expect(api.startDownload).not.toHaveBeenCalled();
    expect(result.score.file).toBe('jude.musicxml');
  });

  it('links the Notes piece on stage instead of storing the score again', async () => {
    const existing = song('s1', '/media?path=mix.mp3');
    const { api, pieces } = fakeApi([existing], [existing], []);
    const result = await importRecording(
      input({ fromPiece: { pieceId: 'old', scoreFile: 'old.mxl', songId: null } }),
      undefined,
      api,
    );
    expect(api.createPiece).not.toHaveBeenCalled();
    expect(api.uploadScore).not.toHaveBeenCalled();
    // the piece keeps its own title
    expect(api.updatePiece).toHaveBeenCalledWith('old', {
      title: 'Hey Jude (piano)',
      artist: 'The Beatles',
      songId: 's1',
    });
    expect(pieces.get('old')?.songId).toBe('s1');
    expect(result.score.file).toBe('old.mxl');
  });

  it('does not touch a piece already linked to the song', async () => {
    const existing = song('s1', '/media?path=mix.mp3', 'Renamed');
    const { api } = fakeApi([existing], [existing], []);
    await importRecording(
      input({
        youtubeUrl: null,
        fromPiece: { pieceId: 'old', scoreFile: 'old.mxl', songId: 's1' },
      }),
      undefined,
      api,
    );
    expect(api.startDownload).not.toHaveBeenCalled();
    expect(api.updatePiece).not.toHaveBeenCalled();
  });

  it('finds the new folder by title when the server reports no song id', async () => {
    const { api } = fakeApi([], [song('new', '/media?path=mix.mp3')], []);
    expect((await importRecording(input(), undefined, api)).song.id).toBe('new');
  });

  it('reports a failed download', async () => {
    const { api } = fakeApi([], [], [{ status: 'error', progress: 10, error: 'yt-dlp failed' }]);
    await expect(importRecording(input(), undefined, api)).rejects.toThrow('yt-dlp failed');
    expect(api.createPiece).not.toHaveBeenCalled();
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
