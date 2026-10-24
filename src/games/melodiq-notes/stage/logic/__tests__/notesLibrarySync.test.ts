import { describe, expect, it, vi } from 'vitest';
import { saveToNotesLibrary, type NotesApi, type NotesSaveInput } from '../notesLibrarySync';

function fakeApi() {
  const uploads: string[] = [];
  const api = {
    createPiece: vi.fn(async (meta: { title: string; artist: string }) => ({
      id: 'p1',
      ...meta,
      updatedAt: 0,
      scores: [],
      recordings: [],
    })),
    upload: vi.fn(async (_id: string, file: File) => {
      uploads.push(file.name);
      return { file: `stored-${file.name}`, kind: 'score' as const };
    }),
    saveMarks: vi.fn(async () => ({ success: true as const })),
  };
  return { api: api as unknown as NotesApi & typeof api, uploads };
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

describe('saveToNotesLibrary', () => {
  it('creates a piece and stores the MusicXML text as a score file', async () => {
    const { api, uploads } = fakeApi();
    const result = await saveToNotesLibrary(base, api);
    expect(api.createPiece).toHaveBeenCalledWith({ title: 'Prelude', artist: 'Bach' });
    expect(uploads).toEqual(['Prelude.musicxml']);
    expect(result).toEqual({
      pieceId: 'p1',
      scoreFile: 'stored-Prelude.musicxml',
      recordingName: null,
    });
    expect(api.saveMarks).not.toHaveBeenCalled();
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
    expect(uploads).toEqual(['Prelude.mxl', 'take.mp3']);
    expect(api.saveMarks).toHaveBeenCalledWith('p1', 'stored-Prelude.mxl', {
      marks,
      offsetSec: 0.2,
      audio: 'stored-take.mp3',
    });
    expect(result.recordingName).toBe('stored-take.mp3');
  });

  it('only adds what is missing to a stored piece', async () => {
    const { api, uploads } = fakeApi();
    await saveToNotesLibrary(
      {
        ...base,
        stored: { pieceId: 'p9', scoreFile: 'a.mxl' },
        recordingName: 'old.mp3',
        marks,
      },
      api,
    );
    expect(api.createPiece).not.toHaveBeenCalled();
    expect(uploads).toEqual([]);
    expect(api.saveMarks).toHaveBeenCalledWith(
      'p9',
      'a.mxl',
      expect.objectContaining({ audio: 'old.mp3' }),
    );
  });

  it('fails without any score', async () => {
    const { api } = fakeApi();
    await expect(saveToNotesLibrary({ ...base, xml: null }, api)).rejects.toThrow('no score');
  });
});
