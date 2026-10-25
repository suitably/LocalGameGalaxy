import { describe, expect, it, vi } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import type { NotesPiece } from '../../../../../lib/companion/notesLibraryApi';
import { buildScoreCatalog, catalogKey, filterCatalog, loadScoreCatalog } from '../scoreCatalog';
import { saveStageToServer, saveTargetFor, type SaveStageApi } from '../notesLibrarySync';

const piece = (id: string, title: string, artist: string, scores = ['a.mxl']): NotesPiece => ({
  id,
  title,
  artist,
  updatedAt: 0,
  scores: scores.map((file) => ({ file, url: `/notes/media/${id}/${file}`, hasMarks: false })),
  recordings: [{ file: 'take.mp3', url: `/notes/media/${id}/take.mp3` }],
});

const song = (id: string, title: string, artist: string, scores: string[]): CompanionSong => ({
  id,
  title,
  artist,
  originalAudio: '/media?path=mix.mp3',
  audio: null,
  instrumentalAudio: null,
  cover: null,
  scores: scores.map((file) => ({ file, url: `/media?path=${file}`, hasMarks: false })),
});

describe('buildScoreCatalog', () => {
  it('merges a Notes piece and a song folder with the same artist and title', () => {
    const entries = buildScoreCatalog(
      [piece('p1', 'Hey Jude', 'The Beatles')],
      [song('s1', 'hey  jude!', 'the beatles', ['jude.mxl'])],
    );
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry.title).toBe('Hey Jude');
    expect(entry.scores.map((s) => `${s.source}:${s.file}`)).toEqual([
      'notes:a.mxl',
      'song:jude.mxl',
    ]);
    expect(entry.pieces).toHaveLength(1);
    expect(entry.songs).toHaveLength(1);
    expect(entry.recordings).toBe(2);
  });

  it('leaves out song folders without sheet music and sorts by artist and title', () => {
    const entries = buildScoreCatalog(
      [piece('p1', 'Zebra', 'B')],
      [song('s1', 'No score', 'A', []), song('s2', 'Alpha', 'B', ['x.mxl'])],
    );
    expect(entries.map((e) => e.title)).toEqual(['Alpha', 'Zebra']);
  });

  it('ignores accents and case in the key', () => {
    expect(catalogKey('Café', 'Björk')).toBe(catalogKey('cafe', 'BJORK'));
  });

  it('filters by artist and title', () => {
    const entries = buildScoreCatalog(
      [piece('p1', 'Hey Jude', 'Beatles'), piece('p2', 'Yes', 'X')],
      [],
    );
    expect(filterCatalog(entries, 'beatles jude').map((e) => e.title)).toEqual(['Hey Jude']);
    expect(filterCatalog(entries, ' ')).toHaveLength(2);
  });
});

describe('loadScoreCatalog', () => {
  it('still lists song folders when the Notes library is not reachable', async () => {
    const catalog = await loadScoreCatalog({
      listPieces: () => Promise.reject(new Error('404')),
      listSongs: async () => [song('s1', 'T', 'A', ['t.mxl'])],
    });
    expect(catalog.errors).toEqual({ notes: '404' });
    expect(catalog.entries).toHaveLength(1);
  });
});

describe('saving the stage', () => {
  const marks = [
    { beat: 0, sec: 0 },
    { beat: 4, sec: 2 },
  ];
  const input = {
    title: 'T',
    artist: 'A',
    scoreFile: new File(['x'], 't.mxl'),
    xml: null,
    recordingFile: null,
    recordingName: 'T',
    marks,
    offsetSec: 0,
  };
  const fakeApi = () => ({
    saveSongMarks: vi.fn(async () => ({ success: true as const })),
    saveToNotes: vi.fn(async () => ({ pieceId: 'p1', scoreFile: 't.mxl', recordingName: 'r.mp3' })),
  });
  const songScore = { kind: 'server' as const, songId: 's1', scoreFile: 't.mxl' };

  it('picks the target from where the score is and whether the recording is local', () => {
    expect(saveTargetFor(songScore, false)).toBe('song-marks');
    expect(saveTargetFor(songScore, true)).toBe('notes');
    expect(saveTargetFor(null, false)).toBe('notes');
    expect(saveTargetFor({ kind: 'notes', pieceId: 'p', scoreFile: 'f' }, false)).toBe('notes');
  });

  it('stores only the marks of a song-folder score played with its mix', async () => {
    const api = fakeApi();
    expect(await saveStageToServer(songScore, input, api as SaveStageApi)).toBeNull();
    expect(api.saveSongMarks).toHaveBeenCalledWith('s1', 't.mxl', {
      marks,
      offsetSec: 0,
      audio: 'T',
    });
    expect(api.saveToNotes).not.toHaveBeenCalled();
  });

  it('copies a song-folder score with a local recording into the Notes library', async () => {
    const api = fakeApi();
    const recordingFile = new File(['a'], 'r.mp3');
    const result = await saveStageToServer(
      songScore,
      { ...input, recordingFile, recordingName: null },
      api as SaveStageApi,
    );
    expect(result?.pieceId).toBe('p1');
    expect(api.saveSongMarks).not.toHaveBeenCalled();
    expect(api.saveToNotes).toHaveBeenCalledWith(
      expect.objectContaining({ stored: null, recordingFile, scoreFile: input.scoreFile }),
    );
  });
});
