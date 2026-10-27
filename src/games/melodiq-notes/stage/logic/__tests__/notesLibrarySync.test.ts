import { describe, expect, it, vi } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import { saveToNotesLibrary, type NotesApi, type NotesSaveInput } from '../notesLibrarySync';

const songFolder = (id: string, title: string, artist: string): CompanionSong => ({
  id,
  title,
  artist,
  originalAudio: null,
  audio: null,
  instrumentalAudio: null,
  cover: null,
  karaoke: false,
});

function fakeApi(existing: CompanionSong[] = []) {
  const uploads: [string, string][] = [];
  const api = {
    listSongs: vi.fn(async () => existing),
    createSong: vi.fn(async (meta: { title: string; artist: string }) =>
      songFolder('new', meta.title, meta.artist),
    ),
    upload: vi.fn(async (songId: string, file: File) => {
      uploads.push([songId, file.name]);
      return { file: `stored-${file.name}` };
    }),
    saveMarks: vi.fn(async () => ({ success: true as const })),
  };
  return { api: api as NotesApi & typeof api, uploads };
}

const base: NotesSaveInput = {
  stored: null,
  title: 'Prelude',
  artist: 'Bach',
  scoreFile: null,
  xml: '<score-partwise/>',
  recordingFile: null,
  recordingName: null,
  marks: null,
  offsetSec: 0,
};

const marks = [
  { beat: 0, sec: 0.5 },
  { beat: 4, sec: 2.5 },
];

describe('saveToNotesLibrary (#568: into song folders)', () => {
  it('creates a song folder for a new song and stores the MusicXML text in it', async () => {
    const { api, uploads } = fakeApi();
    const result = await saveToNotesLibrary(base, api);
    expect(api.createSong).toHaveBeenCalledWith({ title: 'Prelude', artist: 'Bach' });
    expect(uploads).toEqual([['new', 'Prelude.musicxml']]);
    expect(result).toEqual({
      songId: 'new',
      scoreFile: 'stored-Prelude.musicxml',
      recordingName: null,
    });
    expect(api.saveMarks).not.toHaveBeenCalled();
  });

  it('adds the score to the song folder with the same artist and title', async () => {
    const { api, uploads } = fakeApi([songFolder('s1', 'prelude', 'BACH')]);
    const result = await saveToNotesLibrary(base, api);
    expect(api.createSong).not.toHaveBeenCalled();
    expect(uploads).toEqual([['s1', 'Prelude.musicxml']]);
    expect(result.songId).toBe('s1');
  });

  it('prefers the opened file and stores recording and marks with the stored names', async () => {
    const { api, uploads } = fakeApi();
    const result = await saveToNotesLibrary(
      {
        ...base,
        scoreFile: new File(['x'], 'Prelude.mxl'),
        recordingFile: new File(['a'], 'take.mp3'),
        marks,
        offsetSec: 0.2,
      },
      api,
    );
    expect(uploads.map(([, f]) => f)).toEqual(['Prelude.mxl', 'take.mp3']);
    expect(api.saveMarks).toHaveBeenCalledWith('new', 'stored-Prelude.mxl', {
      marks,
      offsetSec: 0.2,
      audio: 'stored-take.mp3',
    });
    expect(result.recordingName).toBe('stored-take.mp3');
  });

  it('only adds what is missing to a stored score', async () => {
    const { api, uploads } = fakeApi();
    await saveToNotesLibrary(
      { ...base, stored: { songId: 's9', scoreFile: 'a.mxl' }, recordingName: 'old.mp3', marks },
      api,
    );
    expect(api.listSongs).not.toHaveBeenCalled();
    expect(api.createSong).not.toHaveBeenCalled();
    expect(uploads).toEqual([]);
    expect(api.saveMarks).toHaveBeenCalledWith(
      's9',
      'a.mxl',
      expect.objectContaining({ audio: 'old.mp3' }),
    );
  });

  it('stores only the recording for karaoke vocals (no score file, no marks)', async () => {
    const { api, uploads } = fakeApi();
    const result = await saveToNotesLibrary(
      {
        ...base,
        stored: { songId: 'k1', scoreFile: null },
        recordingFile: new File(['a'], 'sung.webm'),
        marks,
      },
      api,
    );
    expect(uploads).toEqual([['k1', 'sung.webm']]);
    expect(api.saveMarks).not.toHaveBeenCalled();
    expect(result).toEqual({ songId: 'k1', scoreFile: null, recordingName: 'stored-sung.webm' });
  });

  it('fails without any score', async () => {
    const { api } = fakeApi();
    await expect(saveToNotesLibrary({ ...base, xml: null }, api)).rejects.toThrow('no score');
  });
});
