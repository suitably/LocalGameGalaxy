import type { BarMark } from '../../../../modules/music-score';
import { saveBarMarks } from '../../../../lib/companion/songScoresApi';
import {
  createNotesPiece,
  saveNotesMarks,
  uploadNotesFile,
} from '../../../../lib/companion/notesLibraryApi';

/** The parts of the stage that go to the Notes library on the companion server. */
export interface NotesSaveInput {
  /** Piece and score already on the server (loaded from the library or saved before). */
  stored: { pieceId: string; scoreFile: string } | null;
  title: string;
  artist: string;
  /** Score to upload when the piece is new: the opened file, else the MusicXML text. */
  scoreFile: File | null;
  xml: string | null;
  /** Local recording that is not on the server yet. */
  recordingFile: File | null;
  /** Name of the recording the marks belong to when it is already stored. */
  recordingName: string | null;
  marks: BarMark[] | null;
  offsetSec: number;
}

export interface NotesSaveResult {
  pieceId: string;
  scoreFile: string;
  /** Stored name of the recording, if there is one. */
  recordingName: string | null;
}

export type NotesApi = {
  createPiece: typeof createNotesPiece;
  upload: typeof uploadNotesFile;
  saveMarks: typeof saveNotesMarks;
};

const defaultApi: NotesApi = {
  createPiece: createNotesPiece,
  upload: uploadNotesFile,
  saveMarks: saveNotesMarks,
};

const scoreFileName = (title: string) => `${title.trim() || 'score'}.musicxml`;

/**
 * Stores what is missing on the server: a new piece with its score, a recording that is still
 * local, and the bar marks. Safe to call again — stored parts are not uploaded twice.
 */
export async function saveToNotesLibrary(
  input: NotesSaveInput,
  api: NotesApi = defaultApi,
): Promise<NotesSaveResult> {
  let stored = input.stored;
  if (!stored) {
    const score =
      input.scoreFile ??
      (input.xml
        ? new File([input.xml], scoreFileName(input.title), {
            type: 'application/vnd.recordare.musicxml+xml',
          })
        : null);
    if (!score) throw new Error('no score to store');
    const piece = await api.createPiece({ title: input.title || 'Score', artist: input.artist });
    const uploaded = await api.upload(piece.id, score);
    stored = { pieceId: piece.id, scoreFile: uploaded.file };
  }

  let recordingName = input.recordingName;
  if (input.recordingFile) {
    recordingName = (await api.upload(stored.pieceId, input.recordingFile)).file;
  }

  if (input.marks && input.marks.length >= 2) {
    await api.saveMarks(stored.pieceId, stored.scoreFile, {
      marks: input.marks,
      offsetSec: input.offsetSec,
      audio: recordingName,
    });
  }
  return { ...stored, recordingName };
}

/** Where the song on stage is stored: a Melodiq song folder, a Notes piece, or nowhere yet. */
export type StoredScore =
  | { kind: 'server'; songId: string; scoreFile: string }
  | { kind: 'notes'; pieceId: string; scoreFile: string }
  | null;

/**
 * Melodiq songs only get their bar marks (score and recording are already in the song folder);
 * everything else goes to the Notes library. Returns the Notes result, or null for a Melodiq song.
 */
export async function saveStageToServer(
  stored: StoredScore,
  input: Omit<NotesSaveInput, 'stored'>,
): Promise<NotesSaveResult | null> {
  if (stored?.kind === 'server') {
    if (input.marks) {
      await saveBarMarks(stored.songId, stored.scoreFile, {
        marks: input.marks,
        offsetSec: input.offsetSec,
        audio: input.recordingName ?? input.recordingFile?.name ?? null,
      });
    }
    return null;
  }
  return saveToNotesLibrary({ ...input, stored: stored?.kind === 'notes' ? stored : null });
}
